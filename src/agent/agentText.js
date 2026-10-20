// Text for agent error codes and install / delete jobs, shared by the tiles, focus view and apps dialog.

export function errorText(t, code) {
  const key = `agentErr.${code}`;
  const s = t(key);
  return s === key ? code : s;
}

/** One line for a headset's job: "Downloading 42%", "Confirm on the headset", "Installed Beat Saber", … */
export function jobText(t, job) {
  const app = job.label || job.package || '';
  const kind = job.kind === 'uninstall' ? 'Uninstall' : 'Install';
  if (job.state === 'failed') return `${t(`job.failed${kind}`, { app })}: ${errorText(t, job.error)}`;
  if (job.state === 'done') return t(`job.done${kind}`, { app });
  if (job.needsWearer) return t('job.confirm');
  if (job.state === 'downloading') return t('job.downloading', { n: job.progress });
  return t(`job.running${kind}`, { app });
}

/** CSS modifier for a job: tone of the pill or row that shows it. */
export function jobTone(job) {
  if (job.state === 'failed') return 'failed';
  if (job.state === 'done') return 'done';
  return job.needsWearer ? 'wearer' : 'running';
}
