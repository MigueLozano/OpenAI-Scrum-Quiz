import { Component, OnInit } from '@angular/core';
import { Option } from './option';
import { environment } from '../../constants/environment';
import OpenAI from 'openai';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css'
})
export class QuizComponent implements OnInit {
  public debug: boolean = false;

  public mainText: string = '';

  public options: Option[] = [
  ];

  readonly openai = new OpenAI({
    apiKey: environment['gptKey'],
    dangerouslyAllowBrowser: true,
  })

  public prompt?: string;
  public response?: string;

  constructor() {}

  ngOnInit(): void {
    this.getFirstQuestion();
    //this.buildFirstQuestionPrompt();
  }

  pickedAnswer(option: Option) {
    console.log('picked option:', option);
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
    console.log(response);
    this.response = response.choices[0].message.content!;
    this.parseResponse(this.response);
  }

  parseResponse(response: string) {
    const feedbackStart = response.indexOf('__Feedback__:');
    const questionStart = response.indexOf('__Question__:');
    const firstOptStart = response.indexOf('a) ');
    const secondOptStart = response.indexOf('b) ');
    const thirdOptStart = response.indexOf('c) ');
    const fourthOptStart = response.indexOf('d) ');
    if(feedbackStart >= 0) {
      const feedback = response.substring(feedbackStart + 14, questionStart);
      console.log('feedback: ' + feedback);
    }
    const question = response.substring(questionStart + 14, firstOptStart);
    console.log(question);
    const firstOpt: Option = { text: response.substring(firstOptStart + 3, secondOptStart - 1), correct: true };
    const secondOpt: Option = { text: response.substring(secondOptStart + 3, thirdOptStart -1), correct: false };
    const thirdOpt: Option = { text: response.substring(thirdOptStart + 3, fourthOptStart -1), correct: false };
    const fourthOpt: Option = { text: response.substring(fourthOptStart + 3), correct: false };

    const options = [firstOpt, secondOpt, thirdOpt, fourthOpt];
    this.shuffle(options);
    this.mainText = question;
    this.options = options;
  }

  buildPrompt(option: Option): string {
    let prompt = 'The question was: ';
    prompt += '"' + this.mainText + '"\n\n'
    prompt += 'The options were: ';
    for(let i = 0; i < this.options.length; i++) {
      const option = this.options[i];
      prompt += String.fromCharCode(97 + i) + ') '
      prompt += option.text;
      prompt += ' (correct: ' + option.correct + ')\n';
    }

    prompt += '\n';
    prompt += 'User\'s answer: ';
    prompt += '"' + option.text + '"\n';
    prompt += 'Correct: ' + option.correct + '\n';
    ///prompt += 'Time taken:' + ...
    prompt += '\n';
    if(option.correct) {
      prompt += 'Generate a more difficult question about Scrum with 4 options, making sure the correct answer is the first one.';
    } else {
      prompt += 'Provide feedback on why this answer is incorrect and ask an easier question about the same topic.';
      prompt += 'Provide 4 options, making sure the correct answer is the first one.'
    }
    prompt += '\n\n';
    prompt += 'Give you answer in this format:\n';
    prompt += '__Fedback__: [[feedback without mentioning the picked answer and explaining in terms of the right option]]\n';
    prompt += '__Question__: [[next question]]'
    prompt += 'a) First option\n';
    prompt += 'b) Second option\n';
    prompt += 'c) Third option\n';
    prompt += 'd) Fourth option';

    return prompt;
  }

  buildPrompt2(option: Option): string {
    const correctOption: Option = this.options.find(opt => opt.correct)!;
    let prompt = 'The user answered the question ';
    prompt += '"' + this.mainText + '" with ';
    prompt += '"' + option.text + '," which is ';
    if(!option.correct) {
      prompt += 'incorrect. The correct answer is ';
      prompt += '"' + correctOption.text + '." '
    } else {
      prompt += 'correct. ';
    }
    //prompt += 'It took them <Time> seconds to respond.';
    prompt += '\n\n';

    if(option.correct) {
      prompt += 'Generate a more difficult question about Scrum with 4 options, making sure the correct answer is the first one.';
    } else {
      prompt += 'Provide feedback on why this answer is incorrect and ask a simpler question about the same topic with 4 options, making sure the correct answer is the first one.';
    }
    prompt += '\n\n';
    prompt += 'Example format:\n';
    prompt += '__Feedback__: feedback without mentioning the picked answer but explaining it in terms of the right option\n';
    prompt += '__Question__: What is the primary role of a Scrum Master in a Scrum team?\n';
    prompt += 'a) First option\n';
    prompt += 'b) Second option\n';
    prompt += 'c) Third option\n';
    prompt += 'd) Fourth option';

    return prompt;
  }

  getFirstQuestion() {
    const question = 'What is the primary role of a Scrum Master in a Scrum team?';
    const options: Option[] = [
      {
        text: 'To facilitate the Scrum process and remove impediments for the team',
        correct: true,
      },
      {
        text: 'To manage the team and assign tasks',
        correct: false,
      },
      {
        text: 'To represent the stakeholders and prioritize the backlog',
        correct: false,
      },
      {
        text: 'To develop the product alongside the team',
        correct: false,
      },
    ];
    this.shuffle(options);

    this.mainText = question;
    this.options = options;
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
  }
}
