/**
 * Tiny process-local event bus — decouples the tool layer from the automation
 * scheduler (tools announce "automations_changed"; the scheduler resyncs cron
 * jobs) without a circular import between tools → scheduler → agent loop → tools.
 */
import { EventEmitter } from "node:events";

export const bus = new EventEmitter();
