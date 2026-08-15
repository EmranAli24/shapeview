/**
 * Group identity, shown in the header badge, the footer and the team dialog.
 * Everything that names the course or the group reads from here so the three cannot drift.
 */

export const GROUP_LABEL = 'Group 08';
export const COURSE = 'CSE 618 — Geographic Information System Lab';
export const INSTITUTION = 'University of Chittagong';

export interface TeamMember {
  name: string;
  /** Student ID, shown right-aligned in monospace. */
  id: string;
}

/**
 * PLACEHOLDERS — replace every row below with the real names and student IDs before
 * submitting. Nothing else needs editing; the dialog sizes itself to however many rows
 * are listed here.
 */
export const TEAM_MEMBERS: TeamMember[] = [
  { name: 'Emran', id: '23701019' },
  { name: 'Emon', id: '23701028' },
  { name: 'Fahim', id: '23701033' },
  { name: 'Saad', id: '23701045' },
  { name: 'Sieam', id: '23701071' },
];
