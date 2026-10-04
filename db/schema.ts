import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const members = sqliteTable('members', {
 id:text('id').primaryKey(), contact:text('contact').notNull(), contactType:text('contact_type').notNull(),
 passwordHash:text('password_hash').notNull(), createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_members_contact').on(t.contact)]);
export const sessions = sqliteTable('sessions', {
 id:text('id').primaryKey(), memberId:text('member_id').notNull().references(()=>members.id,{onDelete:'cascade'}),
 tokenHash:text('token_hash').notNull(), expiresAt:text('expires_at').notNull(), createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_sessions_token_hash').on(t.tokenHash),index('idx_sessions_member').on(t.memberId)]);
export const profiles = sqliteTable('profiles', {
 id: text('id').primaryKey(), userId: text('user_id').notNull().unique(), email: text('email').notNull(),
 name:text('name').notNull(), age:integer('age').notNull(), gender:text('gender').notNull(),
 community:text('community').notNull(), city:text('city').notNull(), occupation:text('occupation').notNull(),
 education:text('education').notNull(), marital:text('marital').notNull(), bio:text('bio').notNull(),
 photo:text('photo'), published:integer('published').notNull().default(1), createdAt:text('created_at').notNull(),
}, t=>[index('idx_profiles_published').on(t.published)]);
export const interests = sqliteTable('interests', {
 id:text('id').primaryKey(), sender:text('sender').notNull().references(()=>profiles.id,{onDelete:'cascade'}),
 recipient:text('recipient').notNull().references(()=>profiles.id,{onDelete:'cascade'}),
 status:text('status').notNull().default('pending'), createdAt:text('created_at').notNull(), pairKey:text('pair_key').notNull().default(''),
},t=>[uniqueIndex('idx_interests_pair').on(t.sender,t.recipient),uniqueIndex('idx_interests_unordered_pair').on(t.pairKey),index('idx_interests_recipient').on(t.recipient)]);
export const shortlists = sqliteTable('shortlists', {
 owner:text('owner').notNull().references(()=>profiles.id,{onDelete:'cascade'}),
 target:text('target').notNull().references(()=>profiles.id,{onDelete:'cascade'}),
},t=>[uniqueIndex('idx_shortlists_pair').on(t.owner,t.target)]);
