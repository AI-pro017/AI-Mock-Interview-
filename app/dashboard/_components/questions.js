// app/dashboard/_components/questions.js
const questions = [
    {
      question: 'I enjoy meeting new people.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I prefer to plan things in advance.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I often feel overwhelmed by social situations.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I am comfortable expressing my feelings.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I like to try new activities.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I prefer to work in teams rather than alone.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I often daydream about future possibilities.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I find it easy to make decisions.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I enjoy discussing my ideas with others.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I feel comfortable taking risks.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I often reflect on my personal values.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I believe in the power of positive thinking.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I prefer routine and structure in my life.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I feel energized after spending time alone.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
    {
      question: 'I like to take the lead in group projects.',
      answers: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    },
  ];
  
  export default questions;
  
// This file stores constants for the interview setup form

export const PRE_CONFIGURED_ROLES = [
    { value: 'Software Engineer', label: 'Software Engineer (Frontend/Backend/Full-stack)' },
    { value: 'Data Scientist', label: 'Data Scientist/Analyst' },
    { value: 'Product Manager', label: 'Product Manager' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Business Analyst', label: 'Business Analyst' },
    { value: 'DevOps Engineer', label: 'DevOps Engineer' },
    { value: 'UI/UX Designer', label: 'UI/UX Designer' },
    { value: 'Sales Representative', label: 'Sales Representative' },
    { value: 'Marketing Manager', label: 'Marketing Manager' },
    { value: 'HR Manager', label: 'HR Manager' },
];

export const INTERVIEW_STYLES = [
    { value: 'Conversational', label: 'Conversational' },
    { value: 'Formal', label: 'Formal' },
    { value: 'Technical Deep Dive', label: 'Technical Deep Dive' },
];

export const FOCUS_AREAS = [
    { value: 'Behavioral', label: 'Behavioral Questions' },
    { value: 'Technical', label: 'Technical Questions' },
    { value: 'Mixed', label: 'A Mix of Both' },
];

export const DIFFICULTY_LEVELS = [
    { value: 'Easy', label: 'Easy' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Hard', label: 'Hard' },
    { value: 'Expert', label: 'Expert' },
];

export const DURATION_OPTIONS = [
    { value: 15, label: '15 Minutes' },
    { value: 30, label: '30 Minutes' },
];

export const INTERVIEW_MODES = [
    { value: 'Practice', label: 'Practice Mode (Get hints and feedback)' },
    { value: 'Assessment', label: 'Assessment Mode (Strict evaluation)' },
];

export const INDUSTRIES = [
    'Technology',
    'Finance',
    'Healthcare',
    'Retail & E-commerce',
    'Education',
    'Manufacturing',
    'Real Estate',
    'Other'
];
  