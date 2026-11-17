from django.db import models

class InfoPage(models.Model):
    title = models.CharField(max_length=200, verbose_name="გვერდის სათაური")
    content_blocks = models.JSONField(default=list, verbose_name="შინაარსის ბლოკები (JSON)")

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "საინფორმაციო გვერდი"
        verbose_name_plural = "საინფორმაციო გვერდები"