export interface QuestionOption {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface Question {
  id: string;
  examLevel: 'Professional' | 'Subprofessional' | 'Both';
  subject: string;
  topic: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  question: string;
  passage?: string;
  choices: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  source?: string;
  tags?: string[];
  active?: boolean;
}

export interface ExamSessionItem {
  itemNumber: number;
  question: Question;
}

export interface DiagnosticQuestion {
  id: string;
  category: 'Numerical' | 'Verbal' | 'Analytical' | 'General Info';
  level: 'Professional' | 'Subprofessional' | 'Both';
  question: string;
  passage?: string;
  options: {
    id: string;
    text: string;
  }[];
  correctOptionId: string;
  explanation: {
    summary: string;
    steps: string[];
    keyTakeaway: string;
  };
}

export interface SubjectCoverage {
  id: string;
  title: string;
  code: string;
  description: string;
  itemCount: string;
  weight: string;
  levels: ('Professional' | 'Subprofessional')[];
  topics: string[];
}

export interface CoreFeature {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  iconName: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}
