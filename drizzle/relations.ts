import { relations } from "drizzle-orm/relations";
import { users, sessions, usageTracking, userSubscriptions, subscriptionPlans, userSupportNotes, adminUsers, sessionCredits, interviewReport, userProfiles, education, workHistory, certifications, adminAuditLog, jobRoles, questionTemplates, copilotPromptTemplates, sessionDetails, accounts } from "./schema";

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	sessions: many(sessions),
	usageTrackings: many(usageTracking),
	userSubscriptions: many(userSubscriptions),
	userSupportNotes: many(userSupportNotes),
	sessionCredits: many(sessionCredits),
	interviewReports: many(interviewReport),
	adminUsers: many(adminUsers),
	sessionDetails: many(sessionDetails),
	accounts: many(accounts),
}));

export const usageTrackingRelations = relations(usageTracking, ({one}) => ({
	user: one(users, {
		fields: [usageTracking.userId],
		references: [users.id]
	}),
	userSubscription: one(userSubscriptions, {
		fields: [usageTracking.subscriptionId],
		references: [userSubscriptions.id]
	}),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({one, many}) => ({
	usageTrackings: many(usageTracking),
	user: one(users, {
		fields: [userSubscriptions.userId],
		references: [users.id]
	}),
	subscriptionPlan: one(subscriptionPlans, {
		fields: [userSubscriptions.planId],
		references: [subscriptionPlans.id]
	}),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({many}) => ({
	userSubscriptions: many(userSubscriptions),
}));

export const userSupportNotesRelations = relations(userSupportNotes, ({one}) => ({
	user: one(users, {
		fields: [userSupportNotes.userId],
		references: [users.id]
	}),
	adminUser: one(adminUsers, {
		fields: [userSupportNotes.adminUserId],
		references: [adminUsers.id]
	}),
}));

export const adminUsersRelations = relations(adminUsers, ({one, many}) => ({
	userSupportNotes: many(userSupportNotes),
	sessionCredits: many(sessionCredits),
	user: one(users, {
		fields: [adminUsers.userId],
		references: [users.id]
	}),
	adminAuditLogs: many(adminAuditLog),
}));

export const sessionCreditsRelations = relations(sessionCredits, ({one}) => ({
	user: one(users, {
		fields: [sessionCredits.userId],
		references: [users.id]
	}),
	adminUser: one(adminUsers, {
		fields: [sessionCredits.adminUserId],
		references: [adminUsers.id]
	}),
}));

export const interviewReportRelations = relations(interviewReport, ({one}) => ({
	user: one(users, {
		fields: [interviewReport.userId],
		references: [users.id]
	}),
}));

export const educationRelations = relations(education, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [education.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({many}) => ({
	educations: many(education),
	workHistories: many(workHistory),
	certifications: many(certifications),
}));

export const workHistoryRelations = relations(workHistory, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [workHistory.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const certificationsRelations = relations(certifications, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [certifications.userProfileId],
		references: [userProfiles.id]
	}),
}));

export const adminAuditLogRelations = relations(adminAuditLog, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [adminAuditLog.adminUserId],
		references: [adminUsers.id]
	}),
}));

export const questionTemplatesRelations = relations(questionTemplates, ({one}) => ({
	jobRole: one(jobRoles, {
		fields: [questionTemplates.jobRoleId],
		references: [jobRoles.id]
	}),
}));

export const jobRolesRelations = relations(jobRoles, ({many}) => ({
	questionTemplates: many(questionTemplates),
	copilotPromptTemplates: many(copilotPromptTemplates),
}));

export const copilotPromptTemplatesRelations = relations(copilotPromptTemplates, ({one}) => ({
	jobRole: one(jobRoles, {
		fields: [copilotPromptTemplates.jobRoleId],
		references: [jobRoles.id]
	}),
}));

export const sessionDetailsRelations = relations(sessionDetails, ({one}) => ({
	user: one(users, {
		fields: [sessionDetails.userId],
		references: [users.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));