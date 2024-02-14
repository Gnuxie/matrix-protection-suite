// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionError, ActionResult, ResultError } from './Action';
import { ActionException, ActionExceptionKind } from './ActionException';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore 2417
// https://github.com/microsoft/TypeScript/issues/4628
// This is really a TypeScript L, no idea why they decided to make this decision
// based on a subjective idea of intuition.
// please remove the ts-ignore while editing the class that's best we can do
// I can't be assed to try cookup some type gymnastics to get out of it
// but feel free to try. @TS just fix it ffs.
export class MatrixException extends ActionException implements ActionError {
  public constructor(
    exception: Error | unknown,
    public readonly matrixErrorCode: string,
    public readonly matrixErrorMessage: string,
    message: string = matrixErrorMessage,
    kind: ActionExceptionKind = ActionExceptionKind.Unknown
  ) {
    super(kind, exception, message);
  }

  public static Result(options: {
    exception: Error;
    exceptionKind?: ActionExceptionKind;
    matrixErrorCode: string;
    matrixErrorMessage: string;
    /** Message will usually include context from the http client such as the endpoint used. */
    message: string;
  }): ActionResult<never, MatrixException> {
    return ResultError(
      new MatrixException(
        options.exceptionKind,
        options.matrixErrorCode,
        options.matrixErrorMessage,
        options.message,
        options.exceptionKind
      )
    );
  }
}
