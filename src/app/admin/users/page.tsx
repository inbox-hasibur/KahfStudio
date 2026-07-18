import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User & Subscription Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage user accounts, view subscription details, and handle tier upgrades.
        </p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Users List
          </CardTitle>
          <CardDescription>View Basic and Premium users.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            User management table will be implemented here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
