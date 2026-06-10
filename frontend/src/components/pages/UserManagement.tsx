import { useState, useEffect } from "react";
import {
    Users, UserPlus, Trash2, Shield, ShieldCheck, Clock, Search,
    Loader2, Mail, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";

interface AuthUser {
    email: string;
    name: string;
    role: string;
    created_at: string;
}

interface LoginLog {
    email: string;
    ip: string;
    user_agent: string;
    timestamp: string;
}

export default function UserManagement() {
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"users" | "logs">("users");

    // Add user form
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [newRole, setNewRole] = useState("analyst");
    const [addingUser, setAddingUser] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/users`);
            if (res.ok) setUsers(await res.json());
        } catch { }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch(`${API_BASE}/users/login-logs?limit=200`);
            if (res.ok) setLoginLogs(await res.json());
        } catch { }
    };

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchUsers(), fetchLogs()]);
            setLoading(false);
        };
        init();
    }, []);

    const handleAddUser = async () => {
        if (!newEmail.trim()) {
            toast.error("Email is required");
            return;
        }
        setAddingUser(true);
        try {
            const res = await fetch(`${API_BASE}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: newEmail, name: newName, role: newRole }),
            });
            if (res.ok) {
                toast.success(`Added ${newEmail}`);
                setNewEmail("");
                setNewName("");
                setNewRole("analyst");
                setDialogOpen(false);
                await fetchUsers();
            } else {
                const err = await res.json();
                toast.error(err.detail || "Failed to add user");
            }
        } catch {
            toast.error("Backend unreachable");
        } finally {
            setAddingUser(false);
        }
    };

    const handleDeleteUser = async (email: string) => {
        if (!confirm(`Remove ${email} from authorized users? They will no longer be able to log in.`)) return;
        try {
            const res = await fetch(`${API_BASE}/users/${encodeURIComponent(email)}`, {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success(`Removed ${email}`);
                await fetchUsers();
            } else {
                toast.error("Failed to remove user");
            }
        } catch {
            toast.error("Backend unreachable");
        }
    };

    const filteredUsers = users.filter(
        (u) =>
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.name.toLowerCase().includes(search.toLowerCase())
    );

    const filteredLogs = loginLogs.filter(
        (l) => l.email.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading users...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage authorized users, roles, and audit login activity
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                        <DialogHeader>
                            <DialogTitle className="text-foreground">Add Authorized User</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div>
                                <Label className="text-foreground">Email Address *</Label>
                                <Input
                                    type="email"
                                    placeholder="user@company.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="bg-muted border-border text-foreground mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-foreground">Display Name</Label>
                                <Input
                                    placeholder="John Doe"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="bg-muted border-border text-foreground mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-foreground">Role</Label>
                                <Select value={newRole} onValueChange={setNewRole}>
                                    <SelectTrigger className="bg-muted border-border mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">
                                            <span className="flex items-center gap-2">
                                                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                                Admin — Full access, manage settings & users
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="analyst">
                                            <span className="flex items-center gap-2">
                                                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                                Analyst — View dashboard, logs, alerts
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddUser} disabled={addingUser}>
                                {addingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                                Add User
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-4">
                <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "users"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        Authorized Users
                        <Badge variant="outline" className="ml-1 font-mono text-[10px]">{users.length}</Badge>
                    </button>
                    <button
                        onClick={() => setActiveTab("logs")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "logs"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Clock className="h-4 w-4" />
                        Login Audit Log
                        <Badge variant="outline" className="ml-1 font-mono text-[10px]">{loginLogs.length}</Badge>
                    </button>
                </div>

                <div className="flex-1" />

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-muted/50 border-border w-64 h-9 text-sm"
                    />
                </div>

                <Button variant="outline" size="sm" onClick={() => { fetchUsers(); fetchLogs(); toast.success("Refreshed"); }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Users Table */}
            {activeTab === "users" && (
                <div className="glass-card rounded-xl overflow-hidden">
                    {filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Users className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-sm font-medium">No authorized users yet</p>
                            <p className="text-xs mt-1">Add users to restrict dashboard access to approved emails only</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Added</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.email}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase">
                                                    {user.name ? user.name[0] : user.email[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground text-sm">{user.name || "—"}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {user.role === "admin" ? (
                                                <Badge className="bg-primary/15 text-primary border-primary/20 text-[11px]">
                                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                                    Admin
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[11px]">
                                                    <Shield className="h-3 w-3 mr-1" />
                                                    Analyst
                                                </Badge>
                                            )}
                                        </td>
                                        <td>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {user.created_at
                                                    ? new Date(user.created_at).toLocaleDateString()
                                                    : "—"}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10 h-7 px-2"
                                                onClick={() => handleDeleteUser(user.email)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Login Audit Logs */}
            {activeTab === "logs" && (
                <div className="glass-card rounded-xl overflow-hidden">
                    {filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Clock className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-sm font-medium">No login activity recorded</p>
                            <p className="text-xs mt-1">Login events will appear here once users sign in</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>IP Address</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.slice(0, 200).map((log, idx) => {
                                    const isAuthorized = users.some((u) => u.email === log.email);
                                    return (
                                        <tr key={idx}>
                                            <td>
                                                <span className="text-sm text-foreground font-mono">{log.email}</span>
                                            </td>
                                            <td>
                                                {isAuthorized ? (
                                                    <Badge className="bg-success/15 text-success border-success/20 text-[11px]">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Authorized
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-destructive/15 text-destructive border-destructive/20 text-[11px]">
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        Unauthorized
                                                    </Badge>
                                                )}
                                            </td>
                                            <td>
                                                <span className="text-xs text-muted-foreground font-mono">{log.ip}</span>
                                            </td>
                                            <td>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Info banner */}
            <div className="glass-card rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-foreground">How email whitelisting works</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        When authorized users are added, only those emails can access the dashboard after Clerk authentication.
                        If no users are added yet, all authenticated users are allowed (open access).
                        Alerts are sent to all authorized users when email notifications are enabled in Settings.
                    </p>
                </div>
            </div>
        </div>
    );
}
