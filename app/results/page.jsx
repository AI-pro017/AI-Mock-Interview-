"use client";
import { useEffect, useState } from 'react';
import { Pie, Bar, Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, ArcElement } from 'chart.js';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement
);

function PersonalityResults() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const response = await fetch('/api/personality-analysis');  // Assuming the API endpoint is '/api/personality-analysis'
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!results) {
    return <div>No results found</div>;
  }

  // Extract the scores and feedback from the results
  const { OpennessScore, ConscientiousnessScore, ExtraversionScore, AgreeablenessScore, NeuroticismScore, feedback } = results;

  // Prepare chart data
  const barChartData = {
    labels: ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'],
    datasets: [
      {
        label: 'Personality Traits',
        data: [OpennessScore, ConscientiousnessScore, ExtraversionScore, AgreeablenessScore, NeuroticismScore],
        backgroundColor: ['#ff9f00', '#ff637d', '#36a2eb', '#4caf50', '#ff3d00'],
      },
    ],
  };

  const pieChartData = {
    labels: Object.keys(feedback),
    datasets: [
      {
        data: Object.values(feedback).map(val => val === 'Open-minded' || val === 'Organized' ? 5 : 2),
        backgroundColor: ['#ff9f00', '#ff637d', '#36a2eb', '#4caf50', '#ff3d00'],
      },
    ],
  };

  const scatterChartData = {
    datasets: [
      {
        label: 'Personality Scores',
        data: [
          { x: 0, y: OpennessScore },
          { x: 1, y: ConscientiousnessScore },
          { x: 2, y: ExtraversionScore },
          { x: 3, y: AgreeablenessScore },
          { x: 4, y: NeuroticismScore },
        ],
        backgroundColor: '#ff9f00',
        pointRadius: 8,
      },
    ],
  };

  return (
    <div  className="p-10">
      <h2 className="font-bold text-2xl mb-4 p-2 border rounded-lg bg-[#538fa7]  text-[#efdd99] text-center">Personality Analysis Results</h2>
      <div>
        <h3 className='p-2 border rounded-lg text-[#e4aa74]    text-xl'>Personality Type: {results.personalityType}</h3>
        <div>
          <h4 className='p-2 border rounded-lg text-[#187396]    text-xl'>Feedback:</h4>
          <ul className='p-2 border rounded-lg text-[#187396]    text-xl'>
            {Object.keys(feedback).map((trait) => (
              <li key={trait}>
                {trait}: {feedback[trait]}
              </li>
            ))}
          </ul>
        </div>
        <div className=" justify-center mb-6 p-20" style={{ width: '1000px', height: '600px' }}>
          <h4>Personality Trait Scores:</h4>
          <Bar data={barChartData} />
        </div>
        <div className=" justify-center mb-6 p-20" style={{ width: '1100px', height: '700px' }}>
          <h4>Personality Feedback Visualization (Pie Chart):</h4>
          <Pie data={pieChartData} />
        </div>
        
      </div>
    </div>
  );
}

export default PersonalityResults;
