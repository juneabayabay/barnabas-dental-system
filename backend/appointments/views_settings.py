from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.email_utils import (
    SMTP_PASSWORD_KEY,
    SMTP_USER_KEY,
    get_smtp_credentials,
    is_smtp_ready,
    send_clinic_email,
    smtp_setup_hint,
)

from .mixins import StaffPermissionMixin
from .models import ClinicSetting, Procedure
from .serializers_settings import ClinicSettingSerializer, StaffProcedureSerializer

SMTP_SETTING_KEYS = {SMTP_USER_KEY, SMTP_PASSWORD_KEY}


class ClinicSettingsListView(StaffPermissionMixin, APIView):
    staff_permissions = {"GET": "settings.view", "PATCH": "settings.manage"}

    def get(self, request):
        settings = ClinicSetting.objects.exclude(key__in=SMTP_SETTING_KEYS).order_by("key")
        return Response(ClinicSettingSerializer(settings, many=True).data)

    def patch(self, request):
        if not isinstance(request.data, list):
            return Response(
                {"detail": "Expected a list of {key, value} objects."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = []
        for item in request.data:
            key = item.get("key")
            if not key:
                continue
            try:
                setting = ClinicSetting.objects.get(key=key)
            except ClinicSetting.DoesNotExist:
                return Response(
                    {"detail": f"Unknown setting key: {key}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer = ClinicSettingSerializer(
                setting,
                data={"value": item.get("value", setting.value)},
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            updated.append(serializer.data)
        return Response(updated)


class ClinicSettingDetailView(StaffPermissionMixin, generics.RetrieveUpdateAPIView):
    staff_permissions = {
        "GET": "settings.view",
        "PATCH": "settings.manage",
        "PUT": "settings.manage",
    }
    serializer_class = ClinicSettingSerializer
    lookup_field = "key"

    def get_queryset(self):
        return ClinicSetting.objects.all()


class StaffProcedureListCreateView(StaffPermissionMixin, generics.ListCreateAPIView):
    staff_permissions = {"GET": "settings.view", "POST": "settings.manage"}
    serializer_class = StaffProcedureSerializer
    pagination_class = None

    def get_queryset(self):
        return Procedure.objects.order_by("name")


class StaffProcedureDetailView(StaffPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    staff_permissions = {
        "GET": "settings.view",
        "PATCH": "settings.manage",
        "PUT": "settings.manage",
        "DELETE": "settings.manage",
    }
    serializer_class = StaffProcedureSerializer
    queryset = Procedure.objects.all()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class EmailSettingsView(StaffPermissionMixin, APIView):
    staff_permissions = {
        "GET": "settings.view",
        "PATCH": "settings.manage",
        "POST": "settings.manage",
    }

    def get(self, request):
        user, password = get_smtp_credentials()
        return Response(
            {
                "smtp_user": user,
                "password_configured": bool(password),
                "smtp_ready": is_smtp_ready(),
            }
        )

    def patch(self, request):
        smtp_user = (request.data.get("smtp_user") or "").strip()
        smtp_app_password = (request.data.get("smtp_app_password") or "").strip()

        if smtp_user:
            ClinicSetting.objects.update_or_create(
                key=SMTP_USER_KEY,
                defaults={
                    "value": smtp_user,
                    "description": "Gmail address for sending clinic emails",
                },
            )

        if smtp_app_password:
            ClinicSetting.objects.update_or_create(
                key=SMTP_PASSWORD_KEY,
                defaults={
                    "value": smtp_app_password,
                    "description": "Google App Password for Gmail SMTP",
                },
            )

        return self.get(request)

    def post(self, request):
        """Send a test email to verify Gmail SMTP."""
        if not is_smtp_ready():
            return Response(
                {"detail": smtp_setup_hint()},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        recipient = (request.data.get("email") or get_smtp_credentials()[0] or "").strip()
        if not recipient:
            return Response(
                {"detail": "Provide an email address to test."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sent, error = send_clinic_email(
            subject="Barnabas Dental — email test",
            text_body="If you receive this in Gmail, password reset emails will work.",
            recipient=recipient,
        )
        if not sent:
            return Response(
                {"detail": error or "Unable to send test email."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"detail": f"Test email sent to {recipient}. Check inbox and spam."})
