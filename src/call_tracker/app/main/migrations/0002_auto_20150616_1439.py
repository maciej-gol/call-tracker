# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.contrib.postgres.fields.hstore


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Relation',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('data', django.contrib.postgres.fields.hstore.HStoreField()),
            ],
        ),
        migrations.AddField(
            model_name='node',
            name='url',
            field=models.TextField(default=0, db_index=True),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='node',
            name='type',
            field=models.CharField(max_length=32, db_index=True),
        ),
        migrations.AddField(
            model_name='relation',
            name='source',
            field=models.ForeignKey(related_name='outgoing', to='main.Node'),
        ),
        migrations.AddField(
            model_name='relation',
            name='target',
            field=models.ForeignKey(related_name='incoming', to='main.Node'),
        ),
    ]
