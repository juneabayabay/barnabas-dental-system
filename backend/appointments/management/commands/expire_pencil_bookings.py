from django.core.management.base import BaseCommand

from appointments.models import Appointment
from notifications.services import notify_waiting_list_for_freed_slot


class Command(BaseCommand):
    help = "Expire pencil bookings past their hold window."

    def handle(self, *args, **options):
        expired = 0
        for appt in Appointment.objects.filter(status=Appointment.Status.PENCIL_BOOKED):
            if appt.expire_pencil_if_needed():
                expired += 1
                notify_waiting_list_for_freed_slot(appt.appointment_date)

        self.stdout.write(self.style.SUCCESS(f"Expired {expired} pencil booking(s)."))
