'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, Users, Shield } from 'lucide-react';

export default function TermsOfService() {
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
            <FileText className="w-16 h-16 text-blue-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Terms of Service
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
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing and using AI Mock Interview ("the Service"), you accept and agree to be bound by the terms and 
              provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">AI-Powered Mock Interviews</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Our service provides AI-driven mock interview simulations to help users practice and improve their 
                    interview skills. The service includes personalized feedback, performance analytics, and interview 
                    practice sessions.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">User Accounts</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Users can create accounts to access personalized features, save progress, and track performance 
                    over time. Account creation requires valid email verification.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Data Security</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We implement industry-standard security measures to protect user data and ensure privacy compliance 
                    with applicable regulations.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. User Responsibilities</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              As a user of our service, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 leading-relaxed">
              <li>Provide accurate and truthful information when creating your account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the service for its intended purpose only</li>
              <li>Not attempt to reverse engineer or hack the service</li>
              <li>Respect the intellectual property rights of the service</li>
              <li>Not use the service for any illegal or unauthorized purpose</li>
              <li>Not interfere with or disrupt the service or servers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Acceptable Use Policy</h2>
            <div className="space-y-4">
              <div className="p-4 bg-[#1a2234] rounded-lg border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-2">Permitted Uses:</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                  <li>Personal interview practice and skill development</li>
                  <li>Professional development and career preparation</li>
                  <li>Educational purposes related to interview skills</li>
                </ul>
              </div>
              
              <div className="p-4 bg-red-900/20 rounded-lg border border-red-700">
                <h3 className="text-lg font-medium text-white mb-2">Prohibited Uses:</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                  <li>Sharing account credentials with others</li>
                  <li>Attempting to manipulate or game the AI system</li>
                  <li>Using the service for commercial purposes without permission</li>
                  <li>Uploading malicious content or attempting to harm the service</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Privacy and Data Protection</h2>
            <p className="text-gray-300 leading-relaxed">
              Your privacy is important to us. Our collection and use of personal information is governed by our 
              Privacy Policy, which is incorporated into these Terms of Service by reference. By using our service, 
              you consent to the collection and use of information as detailed in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Intellectual Property Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              The Service and its original content, features, and functionality are and will remain the exclusive 
              property of AI Mock Interview and its licensors. The service is protected by copyright, trademark, 
              and other laws.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Users retain ownership of their interview responses and personal content, but grant us a license to 
              use this data to provide and improve our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Service Availability and Modifications</h2>
            <p className="text-gray-300 leading-relaxed">
              We strive to maintain high service availability but do not guarantee uninterrupted access. We reserve 
              the right to modify, suspend, or discontinue the service at any time with reasonable notice. We are 
              not liable for any modification, suspension, or discontinuance of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
            <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-700">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-yellow-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Important Disclaimer</h3>
                  <p className="text-gray-300 leading-relaxed text-sm">
                    Our service is designed for practice and skill development purposes only. We do not guarantee 
                    job placement or interview success. Users are responsible for their own interview performance 
                    and career outcomes.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed mt-4">
              In no event shall AI Mock Interview be liable for any indirect, incidental, special, consequential, 
              or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other 
              intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Termination</h2>
            <p className="text-gray-300 leading-relaxed">
              We may terminate or suspend your account and bar access to the service immediately, without prior 
              notice or liability, under our sole discretion, for any reason whatsoever, including without limitation 
              if you breach the Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These Terms shall be interpreted and governed by the laws of the jurisdiction in which AI Mock Interview 
              operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will 
              provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change 
              will be determined at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Information</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-[#1a2234] rounded-lg border border-gray-700">
              <p className="text-gray-300">
                <strong>Email:</strong> legal@aimockinterview.com<br />
                <strong>Address:</strong> AI Mock Interview, Legal Team<br />
                <strong>Response Time:</strong> We aim to respond to all legal inquiries within 5 business days
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Acknowledgment</h2>
            <p className="text-gray-300 leading-relaxed">
              By using our service, you acknowledge that you have read these Terms of Service, understand them, 
              and agree to be bound by their terms and conditions.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
