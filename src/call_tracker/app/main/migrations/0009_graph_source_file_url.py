# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0008_graph_state'),
    ]

    operations = [
        migrations.AddField(
            model_name='graph',
            name='source_file_url',
            field=models.URLField(default='', max_length=256),
            preserve_default=False,
        ),
    ]
