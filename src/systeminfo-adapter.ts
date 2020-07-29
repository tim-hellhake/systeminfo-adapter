/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import * as si from 'systeminformation';

import { Adapter, Device, Property } from 'gateway-addon';
import { TimeUnit, convertSecondsToUnit, getUnit } from './time-scaling';

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
  private cpuUsage: Property;
  private avgLoad: Property;

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

    this.cpuUsage = this.createProperty('cpuUsage', {
      type: 'number',
      unit: '%',
      title: 'CPU usage',
      description: 'CPU usage in percent',
      readOnly: true
    });

    this.avgLoad = this.createProperty('avgLoad', {
      type: 'number',
      title: 'Average load',
      description: 'The average cpu load',
      readOnly: true
    });
  }

  async poll() {
    const {
      main
    } = await si.cpuTemperature();

    const {
      avgload,
      currentload
    } = await si.currentLoad();

    this.cpuTemperature.setCachedValue(main);
    this.notifyPropertyChanged(this.cpuTemperature);

    this.cpuUsage.setCachedValue(currentload);
    this.notifyPropertyChanged(this.cpuUsage);

    this.avgLoad.setCachedValue(avgload);
    this.notifyPropertyChanged(this.avgLoad);
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

class Disk extends SystemDevice {
  private memAvailable: Property;

  constructor(adapter: Adapter, mount: string, size: number) {
    super(adapter, mount);
    this.name = mount;
    this['@type'] = ['MultiLevelSensor'];

    this.memAvailable = this.createProperty('memAvailable', {
      '@type': 'LevelProperty',
      type: 'number',
      min: 0,
      max: this.toGb(size),
      unit: 'GB',
      title: 'Available memory',
      description: 'Available memory',
      readOnly: true
    });
  }

  update(fs: si.Systeminformation.FsSizeData) {
    let {
      used,
      size
    } = fs;

    this.memAvailable.setCachedValue(this.toGb(size - used));
    this.notifyPropertyChanged(this.memAvailable);
  }

  private toGb(bytes: number) {
    return bytes / 1024.0 / 1024.0 / 1024.0;
  }
}

class Network extends SystemDevice {
  private up: Property;
  private currentRxSpeed: Property;
  private currentTxSpeed: Property;
  private currentSpeed: Property;

  constructor(adapter: Adapter, nic: string, mbits: number) {
    super(adapter, nic);
    this.name = nic;
    this['@type'] = ['MultiLevelSensor'];

    this.up = this.createProperty('up', {
      type: 'boolean',
      title: 'Up',
      readOnly: true
    });

    this.currentRxSpeed = this.createProperty('currentRxSpeed', {
      type: 'number',
      min: 0,
      max: mbits,
      unit: 'MBit/s',
      title: 'RX speed',
      readOnly: true
    });

    this.currentTxSpeed = this.createProperty('currentTxSpeed', {
      type: 'number',
      min: 0,
      max: mbits,
      unit: 'MBit/s',
      title: 'TX speed',
      readOnly: true
    });

    this.currentSpeed = this.createProperty('currentSpeed', {
      '@type': 'LevelProperty',
      type: 'number',
      min: 0,
      max: mbits,
      unit: 'MBit/s',
      title: 'Total speed',
      readOnly: true
    });
  }

  updateData(interfaceData: si.Systeminformation.NetworkInterfacesData) {
    let {
      operstate
    } = interfaceData;

    this.up.setCachedValue(operstate);
    this.notifyPropertyChanged(this.up);
  }

  updateStats(statsData: si.Systeminformation.NetworkStatsData) {
    let {
      rx_sec,
      tx_sec
    } = statsData;

    this.currentRxSpeed.setCachedValue(this.toMbits(rx_sec));
    this.notifyPropertyChanged(this.currentRxSpeed);

    this.currentTxSpeed.setCachedValue(this.toMbits(tx_sec));
    this.notifyPropertyChanged(this.currentTxSpeed);

    this.currentSpeed.setCachedValue(this.toMbits(rx_sec + tx_sec));
    this.notifyPropertyChanged(this.currentSpeed);
  }

  private toMbits(bytesPerSecond: number) {
    return bytesPerSecond * 8 / 1024.0 / 1024.0;
  }
}

class System extends SystemDevice {
  private uptime: Property;
  private scaledUptime: Property;
  private unit: TimeUnit = 's';

  constructor(private adapter: Adapter) {
    super(adapter, 'system');
    this.name = 'System';
    this['@type'] = ['MultiLevelSensor'];
    this.uptime = this.createUptimeProperty('uptime', this.unit, 'Uptime in seconds');
    this.scaledUptime = this.createUptimeProperty('scaledUptime', this.unit, 'Uptime', { '@type': 'LevelProperty' });
  }

  private createUptimeProperty(name: string, unit: TimeUnit, title: string, additionalProperties?: object): Property {
    const maxSeconds = 365 * 24 * 60 * 60;
    const max = convertSecondsToUnit(maxSeconds, unit);

    return this.createProperty(name, {
      type: 'integer',
      min: 0,
      max,
      unit,
      title,
      description: 'Time since the start of the system',
      readOnly: true,
      ...additionalProperties
    });
  }

  async poll() {
    const {
      uptime
    } = await si.time();

    const uptimeNumber = parseInt(uptime);

    this.uptime.setCachedValue(uptimeNumber);
    this.notifyPropertyChanged(this.uptime);

    const nextUnit = getUnit(uptimeNumber);

    if (this.unit != nextUnit) {
      console.log(`Next unit is ${nextUnit}`);
      this.unit = nextUnit;
      this.scaledUptime = this.createUptimeProperty('scaledUptime', this.unit, 'Uptime', { '@type': 'LevelProperty' });
      this.adapter.handleDeviceAdded(this);
    }

    this.scaledUptime.setCachedValue(convertSecondsToUnit(uptimeNumber, this.unit));
    this.notifyPropertyChanged(this.scaledUptime);
  }
}

export class SysteminfoAdapter extends Adapter {
  private disks: { [key: string]: Disk } = {};
  private networks: { [key: string]: Network } = {};

  constructor(addonManager: any, manifest: any) {
    super(addonManager, SysteminfoAdapter.name, manifest.name);
    addonManager.addAdapter(this);

    const cpu = new Cpu(this);
    this.handleDeviceAdded(cpu);
    cpu.startPolling(1);

    this.createRam();

    setInterval(() => {
      this.updateFs();
      this.updateNetwork();
    }, 1000);

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

  private async updateFs() {
    const fsList = await si.fsSize();

    for (let fs of fsList) {
      let {
        mount,
        size
      } = fs;

      let disk = this.disks[mount];

      if (!disk) {
        console.log(`Creating disk for ${mount}`);
        disk = new Disk(this, mount, size);
        this.handleDeviceAdded(disk);
        this.disks[mount] = disk;
      }

      disk.update(fs);
    }
  }

  private async updateNetwork() {
    const nics = await si.networkInterfaces();

    for (let nic of nics) {
      let {
        iface,
        speed
      } = nic;

      let network = this.networks[iface];

      if (!network) {
        console.log(`Creating network for ${iface}`);
        network = new Network(this, iface, speed);
        this.handleDeviceAdded(network);
        this.networks[iface] = network;
        network.updateData(nic);
      }
    }

    const nicStats = await si.networkStats();

    for (let nicStat of nicStats) {
      let {
        iface
      } = nicStat;

      let network = this.networks[iface];

      if (network) {
        network.updateStats(nicStat);
      }
    }
  }
}
