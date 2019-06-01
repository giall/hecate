import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {

  @PrimaryGeneratedColumn() id: number;
  @Column() username: string;
  @Column() hash: string;
  @Column() email: string;
  @Column() role: 'user' | 'admin';
  @Column({nullable: true}) sessions: string;

  getSessions() {
    return this.sessions && this.sessions.split(',') || [];
  }

  setSessions(sessions: string[]): void {
    this.sessions = sessions.join(',');
  }

  sessionValid(session: string): boolean {
    return this.getSessions().includes(session);
  }
}