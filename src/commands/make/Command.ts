import Common from '../../Common';

export default class MakeCommand extends Common {
  public static async run() {
    let cmdName = await this.getInput('Command Class Name');
    if (cmdName.length === 0) {
      this.showError('A command name is required');
      return;
    }

    let consoleName = await this.getInput('What is the terminal command name? (Default is "command:name")');
    let command = `make:command ${cmdName} ${consoleName.length > 0 ? '--command=' + consoleName : ''}`;

    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the command', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Console/Commands/' + cmdName + '.php');
      }
    });
  }
}
