import Common from '../../Common';

export default class MakePolicy extends Common {
  public static async run() {
    let policyName = await this.getInput('Policy Name');
    if (policyName.length === 0) {
      this.showError('A policy name is required');
      return;
    }

    let model = await this.getInput('What model should I apply this policy to?');
    let command = `make:policy ${policyName} ${model.length > 0 ? '--model=' + model : ''}`;

    this.execCmd(command, async info => {
      if (info.err) {
        this.showError('Could not create the policy', info.err);
      } else {
        await this.openFile(info.artisan.dir, '/app/Policies/' + policyName + '.php');
      }
    });
  }
}
