import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; //allows for http 
import { Observable } from 'rxjs'; //handels async req

//interface definitions of data types/strucutres for the API
export interface LoginDto { 
  username: string; 
  password: string; 
}

export interface RegisterDto { 
  username: string; 
  password: string; 
  email: string; 
}

export interface ApiUser { 
  id: string; 
  username: string; 
  roles: string[]; 
  groups: string[]; 
  email?: string; //make this requried, invesitgate later the impac tin other files
  avatarPath?: string;
}

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  memberIds: string[];
  adminIds: string[];
}

export interface Channel {
  id: string;
  name: string;
  groupId: string;
  creatorId: string;
  bannedUserIds: string[];
}

@Injectable({ providedIn: 'root' }) //app-wide singleton service
export class ApiService {
  private base = 'https://localhost:3000'; // dev

  constructor(private http: HttpClient) {} //inject http client for api calls

  //user authenticaiton for login connect to server/routes/auth.js 
  login(body: LoginDto): Observable<ApiUser> {
    return this.http.post<ApiUser>(`${this.base}/api/login`, body);
  }

//register new user account | psots to server/routes/auth.js
  register(body: RegisterDto): Observable<{ ok: boolean; id?: string; msg?: string }> {
    return this.http.post<{ ok: boolean; id?: string; msg?: string }>(`${this.base}/api/register`, body);
  }

//fetch all users | posts to server/routes/users.js
  getUsers(): Observable<ApiUser[]> {
    return this.http.get<ApiUser[]>(`${this.base}/api/users`);
  }
//same as before but with adminId, used for admin panel | posts to server/routes/admin.js
  adminGetUsers(adminId: string): Observable<ApiUser[]> {
    return this.http.get<ApiUser[]>(`${this.base}/admin/users?adminId=${adminId}`);
  }

//creation of a user by admin on admin panel | posts to server/routes/admin.js
  adminCreateUser(adminId: string, username: string, email?: string, password?: string): Observable<{ ok: boolean; user?: ApiUser; msg?: string }> {
    return this.http.post<{ ok: boolean; user?: ApiUser; msg?: string }>(`${this.base}/admin/users`, { adminId, username, email, password });
  }

//promote/demote group admin role | posts to server/routes/admin.js
  adminToggleGroupAdmin(userId: string, adminId: string, promote: boolean): Observable<{ ok: boolean; msg?: string }> {
    if (promote) {
      return this.http.patch<{ ok: boolean; msg?: string }>(`${this.base}/admin/users/${userId}/role`, { add: 'group_admin', adminId });
    }
    return this.http.patch<{ ok: boolean; msg?: string }>(`${this.base}/admin/users/${userId}/role`, { remove: 'group_admin', adminId });
  }

//add a user to a group by admin on group detail page | posts to server/routes/admin.js
  adminAddUserToGroup(groupId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/admin/groups/${groupId}/members`, { userId, adminId });
  }

//remove a user from a group by admin on group detail page | posts to server/routes/admin.js
  adminRemoveUserFromGroup(groupId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/admin/groups/${groupId}/members/${userId}?adminId=${adminId}`);
  }

//creation of a group by user on dashbaord | posts to server/routes/groups.js
  createGroup(name: string, creatorId: string): Observable<Group> {
    return this.http.post<Group>(`${this.base}/api/groups`, { name, creatorId });
  }

//get groups for a user | posts to server/routes/users.js
  getUserGroups(userId: string): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.base}/api/users/${userId}/groups`);
  }

//investiagte further on its requirmeent (is it needed when admin verison exists?) this posts to server/routes/groups.js
  addUserToGroup(groupId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/members`, { userId, adminId });
  }

//promote a user to group admin | posts to server/routes/groups.js or users.js investiagte further
  promoteUserToGroupAdmin(groupId: string, userId: string, promoterId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/promote`, { userId, promoterId });
  }

//creation of a channel in a group | posts to server/routes/groups.js
  createChannel(groupId: string, name: string, creatorId: string): Observable<Channel> {
    return this.http.post<Channel>(`${this.base}/api/groups/${groupId}/channels`, { name, creatorId });
  }

//get channels for a group | posts to server/routes/groups.js
  getGroupChannels(groupId: string): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.base}/api/groups/${groupId}/channels`);
  }

//get all channels for a user in a group | posts to server/routes/groups.js
  getGroupChannelsForUser(groupId: string, userId: string): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.base}/api/groups/${groupId}/channels`, { params: { userId } as any });
  }

//invesitgate no implemtnation so far
  addUserToChannel(channelId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/channels/${channelId}/members`, { userId, adminId });
  }

//remove a user from a channel by admin on channel detail page | posts to server/routes/channels.js
  removeUserFromChannel(channelId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/channels/${channelId}/members/${userId}`, { body: { adminId } });
  }

//ban a user from a channel by admin on channel detail page | posts to server/routes/channels.js
  banUserFromChannel(channelId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/channels/${channelId}/ban`, { userId, adminId });
  }

//remove a user by admin on admin panel | posts to server/routes/users.js
  removeUser(userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/users/${userId}`, { body: { adminId } });
  }

//promote a user to super admin by admin on admin panel | posts to server/routes/users.js
  promoteToSuperAdmin(userId: string, promoterId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/users/${userId}/promote-super`, { promoterId });
  }

//delete a user by themself | posts to server/routes/users.js
  deleteUserSelf(userId: string, password: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/users/${userId}/self`, { body: { password } });
  }

//remove a group by admin on group detaisl page | posts to server/routes/groups.js
  removeGroup(groupId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}`, { body: { adminId } });
  }

//remove a user from a group by admin on group detail page | posts to server/routes/groups.js
  removeUserFromGroup(groupId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/members/${userId}`, { body: { adminId } });
  }

//leave a group by user on group detail page | posts to server/routes/groups.js
  leaveGroup(userId: string, groupId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/users/${userId}/groups/${groupId}`);
  }

//register a user to a group by user on dashbaord| posts to server/routes/groups.js
  registerGroupInterest(groupId: string, userId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/interest`, { userId });
  }

//get all group join-interest requests (test if authentication in group page for this(no base users allowed access)) | posts to server/routes/groups.js
  getGroupInterests(groupId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/api/groups/${groupId}/interests`);
  }

//approve a join-interest request by admin on group detail page | posts to server/routes/groups.js
  approveGroupInterest(groupId: string, interestId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/interests/${interestId}/approve`, { adminId });
  }

//reject a join-interest request by admin on group detail page | posts to server/routes/groups.js
  rejectGroupInterest(groupId: string, interestId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/interests/${interestId}`, { body: { adminId } });
  }

//get all group members | posts to server/routes/groups.js
  getGroupMembers(groupId: string): Observable<ApiUser[]> {
    return this.http.get<ApiUser[]>(`${this.base}/api/groups/${groupId}/members`);
  }

//get all groups | posts to server/routes/groups.js
  getAllGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.base}/api/groups`);
  }

//delete a channel by admin on channel detail page | posts to server/routes/groups.js
  removeChannel(channelId: string, adminId: string, groupId?: string): Observable<{ ok: boolean; msg?: string }> {
    // Prefer new route with groupId if provided
    if (groupId) {
      return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/channels/${channelId}`, { body: { adminId } });
    }
    // fallback (will likely 404 after changes)
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/groups/${groupId}/channels/${channelId}`, { body: { adminId } });
  }

//unban a user from a channel by admin on channel detail page | posts to server/routes/channels.js
  unbanUserFromChannel(channelId: string, userId: string, adminId: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.delete<{ ok: boolean; msg?: string }>(`${this.base}/api/channels/${channelId}/ban/${userId}`, { body: { adminId } });
  }

//create a report by group admin on group detail page | posts to server/routes/reports.js
  createReport(reporterId: string, subject: string, message: string, type: string, relatedUserId?: string): Observable<{ ok: boolean; msg?: string }> {
    return this.http.post<{ ok: boolean; msg?: string }>(`${this.base}/api/reports`, { reporterId, subject, message, type, relatedUserId });
  }

//get all reports by super admin on admin panel | posts to server/routes/reports.js
  getReports(adminId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/api/reports?adminId=${adminId}`);
  }
} 