import Common from '../../Common';

export default class MakeListener extends Common {
  public static async run() {
    let listenerName = await this.getInput('Listener Name');
    if (listenerName.length === 0) {
      this.showError('A listener name is required');
      return;
    }

    let event = await this.getInput('What event class should I listen for?');
    let queued = await this.getYesNo('Should I make the listener queued?');
    let command = `make:listener ${listenerName} ${event.length > 0 ? '--event=' + event : ''} ${queued ? '--queued' : ''}`;

    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the listener', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Listeners/' + listenerName + '.php');
      }
    });
  }
}
