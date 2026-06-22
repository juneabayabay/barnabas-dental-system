from .models import Notification


def create_notification(user, notification_type, title, message, appointment=None):
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        appointment=appointment,
    )


def notify_waiting_list_for_freed_slot(appointment_date):
    """Notify active waiting-list patients when a slot opens on a given date."""
    from .models import WaitingListEntry

    for entry in WaitingListEntry.objects.filter(is_active=True):
        notify_waiting_list_slot(entry, appointment_date)


def notify_appointment_confirmed(appointment):
    create_notification(
        user=appointment.patient,
        notification_type=Notification.Type.APPOINTMENT_CONFIRMED,
        title="Appointment confirmed",
        message=(
            f"Your appointment on {appointment.appointment_date} "
            f"at {appointment.start_time.strftime('%I:%M %p')} is confirmed."
        ),
        appointment=appointment,
    )


def notify_appointment_cancelled(appointment, fee=0):
    fee_msg = f" A cancellation fee of ₱{fee} applies." if fee else ""
    create_notification(
        user=appointment.patient,
        notification_type=Notification.Type.APPOINTMENT_CANCELLED,
        title="Appointment cancelled",
        message=(
            f"Your appointment on {appointment.appointment_date} "
            f"at {appointment.start_time.strftime('%I:%M %p')} was cancelled.{fee_msg}"
        ),
        appointment=appointment,
    )


def notify_waiting_list_slot(entry, appointment_date):
    create_notification(
        user=entry.patient,
        notification_type=Notification.Type.WAITING_LIST_SLOT,
        title="Slot available",
        message=(
            f"A slot opened on {appointment_date}. "
            "Book now before it is taken."
        ),
    )
