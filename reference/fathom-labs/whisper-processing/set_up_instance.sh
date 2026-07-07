#!/bin/bash

#============================================================
# Instance "Deep Learning AMI (Ubuntu 20.04, Pytorch 1.12.1)"
#============================================================
# First time running: load vars from config at the start of the script
if [[ -f ~/.set_up_instance.conf ]]; then
  . ~/.set_up_instance.conf
fi

# check whether var has been set to determine first run
if [[ -z $has_run ]]; then
  echo 'first run'
  sudo apt-get update
  sudo apt-get -y install python3-pip
  sudo apt install -y libmysqlclient-dev
  sudo apt-get -y install postgresql-client
  sudo apt-get -y install python3-uvloop
  sudo apt-get -y install libpq-dev
  sudo apt -y install ffmpeg

  mkdir -p /home/ubuntu/whisper_processing/runtimes
  mkdir -p /home/ubuntu/whisper_processing/temp_audio_folder

  # set variable in config file for next time
  echo 'has_run=1' >> ~/.set_up_instance.conf
fi
#==========================================================
# create systemd services to run on boot:

# /etc/systemd/system/whisper-processing.service:
# [Unit]
# Description=Whisper processing
# After=network.target
# StartLimitIntervalSec=0
# [Service]
# Type=simple
# Restart=always
# RestartSec=10
# ExecStart=/home/ubuntu/whisper_processing/production_boot "whisper"
# [Install]
# WantedBy=multi-user.target

# /etc/systemd/system/whisper-heartbeat.service:
# [Unit]
# Description=Whisper heartbeat
# After=network.target
# StartLimitIntervalSec=0
# [Service]
# Type=simple
# Restart=always
# RestartSec=10
# ExecStart=/home/ubuntu/whisper_processing/production_boot "heartbeat"
# [Install]
# WantedBy=multi-user.target


# #Command to run:
# sudo systemctl daemon-reload
# sudo systemctl enable whisper-processing.service
# sudo systemctl enable whisper-heartbeat.service

# sudo systemctl start whisper-processing.service
# sudo systemctl start whisper-heartbeat.service

# sudo systemctl status whisper-*
