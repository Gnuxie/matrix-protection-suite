// Copyright (C) 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0

export class ConstantPeriodBatch {
  private finished = false;
  constructor(cb: () => void, delayMS = 0) {
    setTimeout(() => {
      this.finished = true;
      cb();
    }, delayMS);
  }

  public isFinished() {
    return this.finished;
  }
}
