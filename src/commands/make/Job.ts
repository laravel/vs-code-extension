import Common from '../../Common';

export default class MakeJob extends Common {
  public static async run() {
    let jobName = await this.getInput('Job Name');
    if (jobName.length === 0) {
      this.showError('A job name is required');
      return;
    }

    let sync = await this.getYesNo('Should I make this job synchronous?');
    let command = `make:job ${jobName} ${sync ? '--sync' : ''}`;

    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the job', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Jobs/' + jobName + '.php');
      }
    });
  }
}
