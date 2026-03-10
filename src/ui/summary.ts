import { RoundScores } from '../scoring/scorer';

export class SummaryScreen {
  private overlay: HTMLElement;
  private content: HTMLElement;

  constructor() {
    this.overlay = document.getElementById('summary-overlay')!;
    this.content = document.getElementById('summary-content')!;
  }

  show(scores: RoundScores, outcome: string, objectId: string): void {
    const categories = [
      { label: 'Alignment', value: scores.alignment },
      { label: 'Judgment', value: scores.judgment },
      { label: 'Smoothness', value: scores.smoothness },
      { label: 'Stability', value: scores.stability },
    ];

    const scoreRows = categories
      .map(
        (c) => `
      <div class="score-row">
        <span class="score-label">${c.label}</span>
        <div class="score-bar-bg">
          <div class="score-bar-fill" style="width: ${c.value * 100}%"></div>
        </div>
        <span class="score-value">${(c.value * 100).toFixed(0)}</span>
      </div>
    `
      )
      .join('');

    this.content.innerHTML = `
      <div class="outcome-label ${outcome}">${outcome}</div>
      <div class="object-label">${objectId}</div>
      <div class="score-chart">${scoreRows}</div>
      <div class="overall-label">Overall</div>
      <div class="overall-score">${(scores.overall * 100).toFixed(0)}</div>
      <div class="continue-prompt">Press Space or Enter to continue</div>
    `;

    this.overlay.classList.remove('hidden');
  }

  hide(): void {
    this.overlay.classList.add('hidden');
  }
}
