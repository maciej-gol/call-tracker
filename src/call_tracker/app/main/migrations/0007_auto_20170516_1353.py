# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0006_auto_20170329_1502'),
    ]

    operations = [
        migrations.CreateModel(
            name='Graph',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
            ],
        ),
        migrations.AddField(
            model_name='node',
            name='graph',
            field=models.ForeignKey(to='main.Graph', null=True),
        ),
        migrations.AlterIndexTogether(
            name='node',
            index_together=set([('graph', 'url'), ('graph', 'type')]),
        ),
    ]
