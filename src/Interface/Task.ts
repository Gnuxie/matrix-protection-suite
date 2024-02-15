// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Logger } from '../Logging/Logger';
import { ActionError, ActionResult, isError } from './Action';
import { ActionException, ActionExceptionKind } from './ActionException';

const log = new Logger('Task');

/**
 * An error reporter should destructure `ActionException`s to get all of the
 * context and the referenced uuid.
 */
export type TaskErrorReporter = (error: ActionError) => void;

let globalTaskReporter: TaskErrorReporter = function (error) {
  if (error instanceof ActionException) {
    log.warn(
      `A Task failed with an ActionException`,
      error.uuid,
      ...error.getElaborations(),
      error.message,
      error.exceptionKind
    );
    return;
  }
  log.warn(
    `A Task failed with an ActionError`,
    ...error.getElaborations(),
    error.message
  );
};

/**
 * Allows the reporter for all failed tasks to be set.
 * @param reporter A function that implements `TaskErrorReporter`.
 * @see {@link TaskErrorReporter}.
 */
export function setGlobalTaskReporter(reporter: TaskErrorReporter): void {
  globalTaskReporter = reporter;
}

/**
 * Sometimes an `Action` takes place in the background usually a result of an
 * event listener. This means that any errors that are experienced will not
 * have a direct way to reach the user of the application.
 *
 * Up until now, the doctrine for this situation has been to simply log
 * at the error level and move on. However, as a background task failing
 * silently is distinct from simply reporting an error to the error level,
 * we believe that the ability for a consumer of the library to configure
 * what happens to these errors is important.
 */
export async function Task(
  task: Promise<ActionResult<void> | void>
): Promise<void> {
  try {
    const result = await task;
    if (result !== undefined && isError(result)) {
      globalTaskReporter(result.error);
      return;
    }
    return;
  } catch (exception) {
    const actionException = new ActionException(
      ActionExceptionKind.Unknown,
      exception,
      'A Task failed with an unknown exception'
    );
    globalTaskReporter(actionException);
  }
}
