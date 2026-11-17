from django.db import models
from tickets.models import Ticket

class Payment(models.Model):
    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'მოლოდინში'
        SUCCESS = 'SUCCESS', 'წარმატებული'
        FAILED = 'FAILED', 'წარუმატებელი'

    ticket = models.OneToOneField(Ticket, on_delete=models.CASCADE, verbose_name="ბილეთი", related_name='payment')
    amount = models.DecimalField(max_digits=8, decimal_places=2, verbose_name="გადასახდელია თანხა ₾")
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING, verbose_name="გადახდის სტატუსი")
    transaction_id = models.CharField(max_length=100, unique=True, verbose_name="ტრანზაქციის ID", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="გადახდის დრო")

    def __str__(self):
        return f"გადახდა №{self.id} - ბილეთი #{self.ticket.id} ({self.get_status_display()})"

    class Meta:
        verbose_name = "გადახდა"
        verbose_name_plural = "გადახდები"