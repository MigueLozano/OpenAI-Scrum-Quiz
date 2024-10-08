import { Component, inject, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogModule, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { Option } from './option';
import { environment } from '../../constants/environment';
import OpenAI from 'openai';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css'
})
export class QuizComponent implements OnInit {
  readonly dialog = inject(MatDialog);
  public debug: boolean = true;
  public loading: boolean = false;

  public mainText: string = '';

  private pickedOption?: Option;
  public options: Option[] = [
  ];

  readonly openai = new OpenAI({
    apiKey: environment['gptKey'],
    dangerouslyAllowBrowser: true,
  })

  public prompt?: string;
  public response?: string;
  public responseDelay?: number;
  private responseStart?: Date;

  constructor() {}

  ngOnInit(): void {
    this.getFirstQuestion();
  }

  pickedAnswer(option: Option) {
    console.log('Picked answer:', option.text, '(' + option.correct + ')');
    this.loading = true;
    this.pickedOption = option;
    this.responseStart = new Date();
    const prompt = this.buildPrompt(option);
    this.sendPrompt(prompt);
  }

  async sendPrompt(prompt: string) {
    this.prompt = prompt;
    const response = await this.openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: environment['model'],
      n: 1,
    });
    this.response = response.choices[0].message.content!;
    this.parseResponse(this.response);
    this.loading = false;
    this.responseDelay = (new Date().getTime() - this.responseStart!.getTime()) / 1000;
  }

  parseResponse(response: string) {
    const feedbackStart = response.indexOf('__Feedback__:');
    const questionStart = response.indexOf('__Question__:');
    const firstOptStart = response.indexOf('a) ');
    const secondOptStart = response.indexOf('b) ');
    const thirdOptStart = response.indexOf('c) ');
    const fourthOptStart = response.indexOf('d) ');

    const question = response.substring(questionStart + 14, firstOptStart);
    const options: Option[] = [
      { index: 0, text: response.substring(firstOptStart + 3, secondOptStart - 1), correct: false },
      { index: 0, text: response.substring(secondOptStart + 3, thirdOptStart -1), correct: false },
      { index: 0, text: response.substring(thirdOptStart + 3, fourthOptStart -1), correct: false },
      { index: 0, text: response.substring(fourthOptStart + 3), correct: false },
    ];
    for(let i = 0; i < options.length; i++) {
      const option = options[i];
      if(option.text.includes('*')) {
        option.correct = true;
        option.text = option.text.replaceAll('*', '');
      }
    }
    this.shuffle(options);

    if(feedbackStart >= 0 && !this.pickedOption?.correct) {
      const feedback = response.substring(feedbackStart + 14, questionStart);
      console.log('Feedback: ' + feedback);
      console.log('_______________');
      const dialogRef = this.dialog.open(FeedbackDialog, {
        data: { feedback },
      });
      dialogRef.afterClosed().subscribe(_ => {
        this.mainText = question;
        this.pickedOption = undefined;
        this.options = options;
      })
    } else {
      console.log('_______________');
      this.mainText = question;
      this.pickedOption = undefined;
      this.options = options;
    }
    console.log('question: ' + question);
    console.log('options:');
    this.options.forEach(opt => {
      console.log('    ' + opt.text + ' (' + opt.correct + ')');
    })

  }

  buildPrompt(option: Option): string {
    let prompt = 'Act as a Scrum coach. The user is answering a multiple choice question. The question was: ';
    prompt += '"' + this.mainText + '"\n';

    prompt += 'The user answered the question ';
    if(option.correct) {
      prompt += 'correctly.\n';
      prompt += 'Generate a more advanced, nuanced question about Scrum.\n';
    } else {
      const correctOpt = this.options.find(opt => opt.correct)!;
      prompt += 'incorrectly.\n';
      prompt += 'The picked answer was ';
      prompt += '"' + option.text + '"\n';
      prompt += 'The right answer was ';
      prompt += '"' + correctOpt.text + '"\n\n';
      prompt += 'Provide sufficient feedback on why this answer is incorrect while addressing the correct option. Do not mention the answer was incorrect\n';
      prompt += 'Generate a similar but easier question\n';
    }
    prompt += 'Generate 4 multiple choice options with only one correct option in the first place. ';
    prompt += 'Make sure the other 3 options are all wrong. ';
    prompt += 'Mark the correct option by putting a star at the end of it.';
    prompt += '\n\n';
    prompt += 'Give your answer exclusively in this format!:\n';
    prompt += '__Fedback__: [[feedback if requested]]\n';
    prompt += '__Question__: [[next question]]\n'
    prompt += 'a) Correct option*\n';
    prompt += 'b) Second option\n';
    prompt += 'c) Third option\n';
    prompt += 'd) Fourth option\n\n';

    prompt += 'Here\'s an example for clarity:\n\n';
    prompt += '__Feedback__: requested feedback\n';
    prompt += '__Question__: In Scrum, who is reponsible for defining the vision of the product?\n';
    prompt += 'a) Product Owner*\n';
    prompt += 'b) Scrum Master\n';
    prompt += 'c) Development Team\n';
    prompt += 'd) Stakeholders\n';


    return prompt;
  }

  getFirstQuestion() {
    const question = 'Imagine your Scrum Development Team is midway through a Sprint, working on several features selected from the Product Backlog. What is the primary responsibility of the Development Team during this Sprint?';
    const options: Option[] = [
      {
        index: 0,
        text: 'To transform the selected Product Backlog items into a potentially shippable product Increment by the end of the Sprint',
        correct: true,
      },
      {
        index: 0,
        text: 'To prioritize the Product Backlog items and ensure they are ordered correctly for the next Sprint',
        correct: false,
      },
      {
        index: 0,
        text: 'To manage the expectations of stakeholders and ensure their requirements are met throughout the Sprint',
        correct: false,
      },
      {
        index: 0,
        text: 'To facilitate and lead all Scrum meetings, including the Daily Scrum, Sprint Review, and Sprint Retrospective',
        correct: false,
      },
    ];
    this.shuffle(options);

    this.mainText = question;
    this.options = options;
  }

  getOptionColor(option: Option): string {
    if(option.correct) {
      return 'rgb(134 239 172)';
    } else if(this.pickedOption == option) {
      return 'rgb(252 165 165)';
    } else {
      return '';
    }
  }

  shuffle(array: any[]) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    array.forEach((item: any, i: number) => item.index = i);
  }
}

@Component({
  selector: 'feedback-dialog',
  templateUrl: 'feedback-dialog.html',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogClose,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
  ],
})
export class FeedbackDialog {
  readonly dialogRef = inject(MatDialogRef<FeedbackDialog>);
  readonly data = inject<any>(MAT_DIALOG_DATA);
}
