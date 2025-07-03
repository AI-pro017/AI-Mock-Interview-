import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { Clock, Briefcase, Calendar, Star } from 'lucide-react'

function InterviewItemCard({ interview }) {
    const router = useRouter();
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
        // Format date on the client to avoid hydration mismatch
        if (interview?.createdAt) {
            try {
                const date = new Date(interview.createdAt);
                setFormattedDate(date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                }));
            } catch (e) {
                setFormattedDate("");
            }
        }
    }, [interview?.createdAt]);
    
    const onFeedbackPress = () => {
        router.push('/dashboard/interview/' + interview.mockId + "/feedback")
    }
    
    const duration = interview?.duration || 15; // Default to 15 minutes if not specified

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition-colors duration-300 flex flex-col justify-between">
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-base text-white">{interview?.jobPosition}</h3>
                    {interview.overallScore !== null && typeof interview.overallScore !== 'undefined' ? (
                        <div className="flex items-center gap-1.5 bg-sky-500/10 text-sky-300 px-2 py-1 rounded-full text-xs font-medium">
                            <Star className='h-3 w-3' />
                            <span>{interview.overallScore}/100</span>
                        </div>
                    ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full bg-slate-700 text-slate-400`}>
                            No Score
                        </span>
                    )}
                </div>
                
                <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-slate-400">
                        <Briefcase className="h-4 w-4 mr-2 text-slate-500" />
                        <span>{interview?.jobExperience} Years Experience</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-slate-400">
                        <Clock className="h-4 w-4 mr-2 text-slate-500" />
                        <span>{duration} min Interview</span>
                    </div>
                    
                    {formattedDate && (
                        <div className="flex items-center text-sm text-slate-400">
                            <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                            <span>{formattedDate}</span>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-5 pt-0">
                <button 
                    onClick={onFeedbackPress}
                    className="w-full py-2 px-4 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-medium rounded-lg text-sm transition-colors duration-200"
                >
                    View Feedback
                </button>
            </div>
        </div>
    )
}

export default InterviewItemCard