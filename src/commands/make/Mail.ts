import Common from '../../Common';

export default class MakeMail extends Common {
  public static async run() {
    let mailName = await this.getInput('Mail Name');
    if (mailName.length === 0) {
      this.showError('A mail name is required');
      return;
    }

    const markdown = await this.getNoYes('Should this use markdown?');
    let command = `make:mail ${mailName} ${markdown ? '--markdown' : ''}`;

    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the mailer', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Mail/' + mailName + '.php');
      }
    });
  }
}
