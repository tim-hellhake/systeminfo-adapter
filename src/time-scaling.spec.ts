/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { getUnit, convertSecondsToUnit } from './time-scaling';
import { expect } from 'chai';
import 'mocha';

describe('Get proper unit', () => {
    it('59 seconds should be in seconds', () => {
        const unit = getUnit(59);
        expect(unit).to.equal('s');
    });
});

describe('Get proper unit', () => {
    it('60 seconds should be in minutes', () => {
        const unit = getUnit(60);
        expect(unit).to.equal('m');
    });
});

describe('Get proper unit', () => {
    it('3600 seconds should be in hours', () => {
        const unit = getUnit(3600);
        expect(unit).to.equal('h');
    });
});

describe('Get proper unit', () => {
    it('24 hours should be in days', () => {
        const unit = getUnit(3600 * 24);
        expect(unit).to.equal('d');
    });
});

describe('Convert unit', () => {
    it('1 second should be 1 second', () => {
        const time = convertSecondsToUnit(1, 's');
        expect(time).to.equal(1);
    });
});

describe('Convert unit', () => {
    it('60 second should be 1 minute', () => {
        const time = convertSecondsToUnit(60, 'm');
        expect(time).to.equal(1);
    });
});

describe('Convert unit', () => {
    it('3600 seconds should be 1 hour', () => {
        const time = convertSecondsToUnit(3600, 'h');
        expect(time).to.equal(1);
    });
});

describe('Convert unit', () => {
    it('24 hours should be 1 day', () => {
        const time = convertSecondsToUnit(24 * 3600, 'd');
        expect(time).to.equal(1);
    });
});
