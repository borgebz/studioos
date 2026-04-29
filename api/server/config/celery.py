import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("studioos")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.conf.worker_send_task_events = True
app.conf.task_send_sent_event = True
app.autodiscover_tasks()
 