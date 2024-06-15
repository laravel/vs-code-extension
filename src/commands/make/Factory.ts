import Common from '../../Common';

export default class MakeFactory extends Common {
  public static async run() {
    // Get the name of the controller to create
    let name = await this.getInput('Factory Name');
    if (name.length === 0) {
      this.showError('A factory name is required');
      return;
    }

    // Determine if this is a resource controller or not
    let hasModel = await this.getYesNo('Is there a model related to this factory?');
    let modelName = '';
    if (hasModel) {
      modelName = await this.getInput('Does the model have a name? Leave blank to use (Model::class)');
    }
    let command = `make:factory ${name} ${hasModel ? `--model${modelName.length > 0 ? `=${modelName}` : ''}` : ''}`;

    // Generate the factory
    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the factory', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/database/factories/' + name + '.php');
      }
    });
  }
}
