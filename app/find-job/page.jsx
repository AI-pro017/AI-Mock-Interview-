// app/find-job/page.jsx
"use client";

import React, { useState } from "react";
import axios from "axios";

function FindJob() {
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchJobs = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `https://api.adzuna.com/v1/api/jobs/gb/search/1`,
        {
          params: {
            app_id: process.env.NEXT_PUBLIC_ADZUNA_APP_ID,
            app_key: process.env.NEXT_PUBLIC_ADZUNA_APP_KEY,
            what: jobTitle,
            where: location,
          },
        }
      );
      setJobs(response.data.results);
    } catch (err) {
      setError("Failed to fetch jobs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10">
      <h2 className="font-bold text-2xl">Find Job</h2>
      <form onSubmit={fetchJobs}>
        <div>
          <label htmlFor="jobTitle" className="block">
            Job Title:
          </label>
          <input
            type="text"
            id="jobTitle"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="border p-2"
            required
          />
        </div>

        <div>
          <label htmlFor="location" className="block">
            Location:
          </label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border p-2"
            required
          />
        </div>

        <button
          type="submit"
          className="mt-5 p-2 bg-blue-500 text-white rounded"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search Jobs"}
        </button>
      </form>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      <div className="mt-5">
        {jobs.length > 0 ? (
          jobs.map((job) => (
            <div key={job.id} className="border p-4 mb-4">
              <h4 className="font-bold text-xl">{job.title}</h4>
              <p>{job.location.display_name}</p>
              <p>{job.description}</p>
              <a href={job.redirect_url} className="text-blue-500">
                View Job
              </a>
            </div>
          ))
        ) : (
          <p>No jobs found.</p>
        )}
      </div>
    </div>
  );
}

export default FindJob;
