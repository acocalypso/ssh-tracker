# ssh-tracker

SSH Brutforce Logger

This tool is designed to use rsylog to get ssh log entries from /var/auth.log

It is based of SCHKN's Design from <https://devconnected.com/geolocating-ssh-hackers-in-real-time/>

Requirements:
Node V16.x
Influxdb
Rsyslog
Grafana
IPInfo Token free plan -> <https://ipinfo.io/> 50k lookups/month for free

# Installation Steps

Install Influx and create a database named "tracker"

<https://docs.influxdata.com/influxdb/v1.8/introduction/install/>
<https://www.vultr.com/de/docs/how-to-install-influxdb-on-ubuntu-20-04/>

Install Rsyslog if not already available on your system

Create a new config file for rsyslog /etc/rsyslog.d/50-default.conf

```
#  Default rules for rsyslog.
#
#                       For more information see rsyslog.conf(5) and /etc/rsyslog.conf

#
# First some standard log files.  Log by facility.
#
if $programname == 'sshd' then {
   if $msg startswith ' Failed' then {
      action(type="omfwd" target="127.0.0.1" port="7010" protocol="tcp" template="ip-json")
   }
   stop
}

auth,authpriv.*                 /var/log/auth.log
*.*;auth,authpriv.none          -/var/log/syslog
#cron.*                         /var/log/cron.log
#daemon.*                       -/var/log/daemon.log
kern.*                          -/var/log/kern.log
#lpr.*                          -/var/log/lpr.log
mail.*                          -/var/log/mail.log
#user.*                         -/var/log/user.log
```

Create a new config file /etc/rsyslog.d/01-basic-ip.conf

```
template(name="ip-json" type="string" string="{\"username\":\"%msg:R,ERE,1,DFLT:^ Failed.*user ([a-zA-Z]*).* ([0-9][0-9]*[0-9]*.[0-9][0-9]*[0-9]*.[0-9][0-9]*[0-9]*.[0-9][0-9]*[0-9]*).* port ([0-9]*)--end%\",\"ip\":\"%msg:R,ERE,2,DFLT:^ Failed.*user ([a-zA-Z]*).* ([0-9][0-9]*[0-9]*.[0-9][0-9]*[0-9]*.[0-9][0-9]*[0-9]*.[0-9][0-9]*[0-9]*).* port ([0-9]*)--end%\",\"port\":\"%msg:R,ERE,3,DFLT:^ Failed.*user ([a-zA-Z]*).* ([0-9][0-9]*[0-9]*.[0-9][0-9]*[0-9]*.[0-9][0-9]*[0-9]*.[0-9][0-9]*[0-9]*).* port ([0-9]*)--end%\"}")
```

Rsyslog will forward all matched log entries to our TCP Server which will do a lookup on ipinfo.io and save the result to influx.

Install the npm requirements with npm install for the ssh-tracker tcp server.
Copy config.json.example to config.json and provide all details

```
"host" : "127.0.0.1",
"port" : "7071",
"influx_host" : "127.0.0.1",
"influx_db" : "tracker",
"influx_user" : "admin",
"influx_pass" : "WhatEverSuperSecret",
"ipinfo_token": "ABCDEFUC*"
```

Run the TCP server with node ssh-tracker.js
It's suggested to use pm2 to run the node application as a service.

Finally import the Grafan template 'SSH Tracker-Grafana.json' and check for Brutforce freaks.
