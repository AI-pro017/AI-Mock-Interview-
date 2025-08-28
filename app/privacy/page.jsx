'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Eye, Lock, Database } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0d1526] text-gray-300">
      {/* Navigation Bar */}
      <nav className="w-full py-4 px-6 md:px-12 bg-[#111827]/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-700">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white">
            AI Mock Interview
          </Link>
          <div className="space-x-4">
            <Link href="/sign-in" passHref>
              <Button variant="ghost" className="text-white hover:bg-gray-700">Sign In</Button>
            </Link>
            <Link href="/sign-up" passHref>
              <Button className="bg-blue-600 text-white hover:bg-blue-700">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 md:px-12 py-12 max-w-4xl">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="w-16 h-16 text-blue-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-400">
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              At AI Mock Interview, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered 
              mock interview service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Eye className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Personal Information</h3>
                  <p className="text-gray-300 leading-relaxed">
                    When you create an account, we collect your name, email address, and any other information you choose to provide. 
                    This information is used to create and manage your account, provide our services, and communicate with you.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Database className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Interview Data</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We collect and store your interview responses, feedback, and performance analytics to provide personalized 
                    interview experiences and track your progress over time. This data helps us improve our AI algorithms and 
                    provide better feedback.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Lock className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Usage Information</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We automatically collect information about how you use our service, including interview sessions, 
                    features accessed, and time spent on the platform. This helps us improve user experience and service quality.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 leading-relaxed">
              <li>Provide and maintain our AI mock interview service</li>
              <li>Personalize your interview experience and provide relevant feedback</li>
              <li>Improve our AI algorithms and service quality</li>
              <li>Send you important updates about our service</li>
              <li>Respond to your questions and provide customer support</li>
              <li>Ensure the security and integrity of our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We implement industry-standard security measures to protect your personal information and interview data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 leading-relaxed">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication measures</li>
              <li>Secure data centers with physical security measures</li>
              <li>Regular backups and disaster recovery procedures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Data Sharing and Disclosure</h2>
            <p className="text-gray-300 leading-relaxed">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
              except in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 leading-relaxed mt-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
              <li>With trusted service providers who assist in operating our platform (under strict confidentiality agreements)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Your Rights and Choices</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 leading-relaxed">
              <li>Access and review your personal information</li>
              <li>Update or correct inaccurate information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your interview data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your personal information and interview data for as long as your account is active or as needed to 
              provide our services. If you delete your account, we will delete your personal information within 30 days, 
              though some data may be retained for legal or legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information 
              from children under 13. If you are a parent or guardian and believe your child has provided us with personal 
              information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
              Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this policy 
              periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-[#1a2234] rounded-lg border border-gray-700">
              <p className="text-gray-300">
                <strong>Email:</strong> privacy@aimockinterview.com<br />
                <strong>Address:</strong> AI Mock Interview, Privacy Team<br />
                <strong>Response Time:</strong> We aim to respond to all privacy-related inquiries within 48 hours
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
