import { BehaviorSubject, Subscription, from, iif, map, of, switchMap, tap } from 'rxjs';
import Common, { Command } from '../../Common';
import Output from '../../utils/Output';

// export interface Argument {
//   command_name: {
//     default: string | null;
//     description: string;
//     is_array: boolean;
//     is_required: boolean;
//     name: string;
//   };
// }
// export interface Option {
//   name: string;
//   description: string;
//   accept_value: boolean;
//   is_value_required: boolean;
//   default: string | null;
//   is_multiple: boolean;
//   shortcut: string;
// }

// export interface Command {
//   name: string;
//   description: string;
//   definition: {
//     arguments: Argument;
//     options: { [key: string]: Option };
//   };
// }

export default class RunCommand extends Common {
  private static lastUpdateTime = -1;
  private static readonly UPDATE_INTERVAL = 5 * 60 * 1000;
  private static commands = new BehaviorSubject<Command[]>([]);
  static commands$ = this.commands.pipe(
    map(commands => {
      if (this.lastUpdateTime === -1 || Math.abs(Date.now() - this.lastUpdateTime) > this.UPDATE_INTERVAL) {
        return [];
      }
      return commands;
    }),
    switchMap(i =>
      iif(
        () => i.length > 0,
        of(i),
        from(this.getCommandList()).pipe(
          tap(() => (this.lastUpdateTime = Date.now())),
          tap(i => this.commands.next(i))
        )
      )
    )
  );

  static sub?: Subscription;

  public static async run() {
    this.sub?.unsubscribe();
    this.sub = this.commands$.subscribe(async commands => {
      // get a list of strings for selectable options
      let items = commands.reduce((a, v) => a.concat(v.name + ' -- ' + v.description), []);
      let cmd = await this.getListInput('Command to run', items);
      if (!cmd) return;

      // Find the command settings from the selected option
      let commandSettings = commands.find(c => c.name === cmd.split('--')[0].trim());

      // Initialize an array of options and arguments
      let opts: string[] = [];
      let args: string[] = [];

      // Ask for information about the arguments
      for (let arg of commandSettings.arguments) {
        let input = await this.getInput(`${arg.name} ${this.getDefaultText(arg)} ${this.getDescription(arg)}`);
        if (this.isValidInput(input)) {
          args.push(`${input.toString().length > 0 ? input : this.toValidInput(arg.default)}`);
        }
      }

      // Ask for information about the options
      for (let opt of commandSettings.options) {
        if (opt.accept_value) {
          let input = await this.getInput(`${opt.name} ${this.getDefaultText(opt)} ${this.getDescription(opt)}`);
          if (this.isValidInput(input)) {
            let val = '';
            opts.push(`${opt.name}${opt.is_value_required ? `=${input.length > 0 ? input : this.toValidInput(opt.default)}` : ''}`);
          }
          // opts.push(`${opt.name}${opt.accept_value ? `=${input.length > 0 ? input : this.toValidInput(opt.default)}` : ''}`)
        } else {
          opts.push(`${opt.name}`);
        }
      }

      // Remove empty items
      args = args.filter(a => a != '');
      opts = opts.filter(a => a != '');

      let command = `${commandSettings.name} ${args.join(' ')} ${opts.join(' ')}`;

      this.execCmd(command, info => {
        if (info.err) {
          this.showError('Could not run the command');
        } else {
          let msg = '';
          if (info.stdout.length > 0) {
            Output.info(info.stdout);
            msg = '(See output console for more information)';
          }
          this.showMessage(`Command "${commandSettings.name}" has finished ${msg}`.trim());
        }
      });
    });
  }

  public static dispose() {
    console.debug('Disposing of RunCommand');
    // this.sub.unsubscribe();
  }

  private static getDefaultText(obj) {
    return this.isValidInput(obj.default) && obj.default.toString().length > 0 ? `[${obj.default}]` : '';
  }

  private static getDescription(obj) {
    return obj.description.toString().length > 0 ? `(${obj.description})` : '';
  }

  private static isValidInput(input) {
    return ['string', 'number'].indexOf(typeof input) > -1;
  }

  private static toValidInput(input: any) {
    return ['string', 'number'].indexOf(typeof input) > -1 ? input.toString() : '';
  }
}
