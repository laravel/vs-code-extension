import Common from '../../Common';

export default class MakeNotification extends Common {
  public static async run() {
    let noteName = await this.getInput('Notification Name');
    if (noteName.length === 0) {
      this.showError('A notification name is required');
      return;
    }

    let command = `make:notification ${noteName}`;

    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the notification', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Notifications/' + noteName + '.php');
      }
    });
  }
}
