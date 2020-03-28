/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

export type TimeUnit = 's' | 'm' | 'h' | 'd';

const defautUnit: TimeUnit = 's';

const unitInfos: { [key: string]: UnitInfo } = {
    s: {
        max: 60,
        next: 'm',
        conversion: (s: number) => s
    },
    m: {
        max: 60 * 60,
        next: 'h',
        conversion: (s: number) => s / 60
    },
    h: {
        max: 60 * 60 * 24,
        next: 'd',
        conversion: (s: number) => s / 60 / 60
    },
    d: {
        max: Number.MAX_VALUE,
        next: 'd',
        conversion: (s: number) => s / 60 / 60 / 24
    }
}

interface UnitInfo {
    max: number,
    next: TimeUnit,
    conversion: (s: number) => number
}

export function getUnit(seconds: number): TimeUnit {
    return getNextUnit(seconds, defautUnit);
}

function getNextUnit(seconds: number, currentUnit: TimeUnit): TimeUnit {
    const unitInfo = unitInfos[currentUnit];

    if (unitInfo) {
        if (unitInfo.max <= seconds) {
            if (unitInfo.next && unitInfo.next != currentUnit) {
                return getNextUnit(seconds, unitInfo.next);
            }
        }
    }

    return currentUnit;
}

export function convertSecondsToUnit(seconds: number, unit: TimeUnit): number {
    const unitInfo = unitInfos[unit];

    return unitInfo.conversion(seconds);
}
