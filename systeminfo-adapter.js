/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

const si = require('systeminformation');

const {
  Adapter,
  Device,
  Property
} = require('gateway-addon');

class Systeminfo extends Device {
  constructor(adapter, manifest) {
    super(adapter, Systeminfo.name);
    this['@context'] = 'https://iot.mozilla.org/schemas/';
    this.name = manifest.display_name;
    this.description = manifest.description;

    this.addProperty('mem_available', {
      type: 'number',
      unit: 'GB',
      title: 'Available memory',
      description: 'Available memory',
      readOnly: true
    });

    this.addProperty('cpu_temperature', {
      type: 'number',
      unit: '°C',
      title: 'CPU temperature',
      description: 'CPU temperature',
      readOnly: true
    });
  }

  addProperty(name, description) {
    const property = new Property(this, name, description);
    this.properties.set(name, property);
  }

  setProperty(name, value) {
    const property = this.properties.get(name);

    if (property) {
      property.setCachedValue(value);
      this.notifyPropertyChanged(property);
    } else {
      console.warn(`Property ${name} not found`);
    }
  }

  startPolling(interval) {
    this.poll();
    this.timer = setInterval(() => {
      this.poll();
    }, interval * 1000);
  }

  async poll() {
    const {
      available
    } = await si.mem();

    const {
      main
    } = await si.cpuTemperature();

    this.setProperty('mem_available', available / 1024 / 1024 / 1024);
    this.setProperty('cpu_temperature', main);
  }
}

class SysteminfoAdapter extends Adapter {
  constructor(addonManager, manifest) {
    super(addonManager, SysteminfoAdapter.name, manifest.name);
    addonManager.addAdapter(this);
    const device = new Systeminfo(this, manifest);
    this.handleDeviceAdded(device);
    device.startPolling(1);
  }
}

module.exports = SysteminfoAdapter;
