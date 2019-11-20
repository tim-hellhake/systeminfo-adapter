/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import * as si from 'systeminformation';

import { Adapter, Device, Property } from 'gateway-addon';

class SystemDevice extends Device {
  constructor(adapter: Adapter, id: string) {
    super(adapter, id);
    this['@context'] = 'https://iot.mozilla.org/schemas/';
  }

  createProperty(name: string, description: any) {
    const property = new Property(this, name, description);
    this.properties.set(name, property);
    return property;
  }

  startPolling(interval: number) {
    this.poll();
    setInterval(() => {
      this.poll();
    }, interval * 1000);
  }

  async poll() {
  }
}

class Cpu extends SystemDevice {
  private cpuTemperature: Property;

  constructor(adapter: Adapter) {
    super(adapter, 'cpu');
    this.name = 'CPU';
    this['@type'] = ['TemperatureSensor'];

    this.cpuTemperature = this.createProperty('cpuTemperature', {
      type: 'number',
      '@type': 'TemperatureProperty',
      unit: 'degree celsius',
      title: 'CPU temperature',
      description: 'CPU temperature',
      readOnly: true
    });
  }

  async poll() {
    const {
      main
    } = await si.cpuTemperature();


    this.cpuTemperature.setCachedValue(main);
    this.notifyPropertyChanged(this.cpuTemperature);
  }
}

class Ram extends SystemDevice {
  private memAvailable: Property;

  constructor(adapter: Adapter, total: number) {
    super(adapter, 'ram');
    this.name = 'RAM';
    this['@type'] = ['MultiLevelSensor'];

    this.memAvailable = this.createProperty('memAvailable', {
      '@type': 'LevelProperty',
      type: 'number',
      min: 0,
      max: this.toMb(total),
      unit: 'MB',
      title: 'Available memory',
      description: 'Available memory',
      readOnly: true
    });
  }

  async poll() {
    const {
      available
    } = await si.mem();


    this.memAvailable.setCachedValue(this.toMb(available));
    this.notifyPropertyChanged(this.memAvailable);
  }

  private toMb(bytes: number) {
    return bytes / 1024.0 / 1024.0;
  }
}

class System extends SystemDevice {
  private uptime: Property;

  constructor(adapter: Adapter) {
    super(adapter, 'system');
    this.name = 'System';

    this.uptime = this.createProperty('uptime', {
      type: 'integer',
      unit: 's',
      title: 'Uptime',
      description: 'Seconds since start of the system',
      readOnly: true
    });
  }

  async poll() {
    const {
      uptime
    } = await si.time();

    this.uptime.setCachedValue(uptime);
    this.notifyPropertyChanged(this.uptime);
  }
}

export class SysteminfoAdapter extends Adapter {
  constructor(addonManager: any, manifest: any) {
    super(addonManager, SysteminfoAdapter.name, manifest.name);
    addonManager.addAdapter(this);

    const cpu = new Cpu(this);
    this.handleDeviceAdded(cpu);
    cpu.startPolling(1);

    this.createRam();

    const system = new System(this);
    this.handleDeviceAdded(system);
    system.startPolling(1);
  }

  private async createRam() {
    const {
      total
    } = await si.mem();

    const ram = new Ram(this, total);
    this.handleDeviceAdded(ram);
    ram.startPolling(1);
  }
}
