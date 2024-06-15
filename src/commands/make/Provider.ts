import Common from '../../Common';

export default class MakeProvider extends Common {
  public static async run() {
    let providerName = await this.getInput('Provider Name');
    if (providerName.length === 0) {
      this.showError('A provider name is required');
      return;
    }

    let command = `make:provider ${providerName}`;

    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the provider', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Providers/' + providerName + '.php');
      }
    });
  }
}
