import Common from '../../Common';

export default class MakeResource extends Common {
  public static async run() {
    // Get the name of the resource to create
    let ctrlName = await this.getInput('Resource Name');
    if (ctrlName.length === 0) {
      this.showError('A resource name is required');
      return;
    }

    // Determine if this is a resource collection or not
    let isCollection = await this.getYesNo('Should I make this a resource collection?');
    let command = `make:resource ${ctrlName} ${isCollection ? '--collection' : ''}`;

    // Generate the resource
    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the resource', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Http/Resources/' + ctrlName + '.php');
      }
    });
  }
}
