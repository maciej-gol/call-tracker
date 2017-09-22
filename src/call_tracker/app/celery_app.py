from celery import Celery


app = Celery()
app.config_from_object('django.conf:settings')
app.autodiscover_tasks()

from call_tracker.client.celery_app import *
