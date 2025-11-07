import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, TrendingUp, DollarSign, Award, Settings, Search, Plus, Minus } from "lucide-react";
import { format } from "date-fns";

type ReferralStats = {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalCreditsAwarded: number;
  conversionRate: number;
};

type TopReferrer = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  referralCode: string;
  successfulReferrals: number;
  totalCreditsEarned: number;
};

type Referral = {
  id: string;
  referrerId: string;
  referrerName: string;
  referredCustomerId: string | null;
  referredCustomerName: string | null;
  referredCustomerEmail: string | null;
  referralCode: string;
  bookingId: string | null;
  status: 'pending' | 'completed' | 'credited';
  tierLevel: number;
  creditAmount: number;
  createdAt: string;
  completedAt: string | null;
};

type ReferralSettings = {
  id: string;
  enabled: boolean;
  minimumServicePrice: number;
  tier1Amount?: number;
  tier2Amount?: number;
  tier3Amount?: number;
  tier1Reward?: number;
  tier2Reward?: number;
  tier3Reward?: number;
};

type CustomerCredit = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  balance: number;
};

export default function AdminReferrals() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreditAdjustmentOpen, setIsCreditAdjustmentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCredit | null>(null);
  const [creditAdjustment, setCreditAdjustment] = useState(0);
  const [programEnabled, setProgramEnabled] = useState(true);

  // Fetch referral stats
  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ["/api/admin/referrals/stats"],
  });

  // Fetch top referrers
  const { data: topReferrers = [] } = useQuery<TopReferrer[]>({
    queryKey: ["/api/admin/referrals/top-referrers"],
  });

  // Fetch all referrals
  const { data: allReferrals = [], isLoading } = useQuery<Referral[]>({
    queryKey: ["/api/admin/referrals"],
  });

  // Fetch referral settings
  const { data: settings } = useQuery<ReferralSettings>({
    queryKey: ["/api/admin/referral-settings"],
    onSuccess: (data) => {
      if (data) {
        setProgramEnabled(data.enabled);
      }
    },
  });

  // Fetch customer credits
  const { data: customerCredits = [] } = useQuery<CustomerCredit[]>({
    queryKey: ["/api/admin/referral-credits"],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<ReferralSettings>) => {
      const res = await fetch("/api/admin/referral-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-settings"] });
      toast({
        title: "Settings updated",
        description: "Referral program settings have been updated successfully.",
      });
      setIsSettingsOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Adjust customer credit mutation
  const adjustCreditMutation = useMutation({
    mutationFn: async ({ customerId, amount }: { customerId: string; amount: number }) => {
      const res = await fetch("/api/admin/referral-credits/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, amount }),
      });
      if (!res.ok) throw new Error("Failed to adjust credit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals/stats"] });
      toast({
        title: "Credit adjusted",
        description: "Customer credit balance has been updated successfully.",
      });
      setIsCreditAdjustmentOpen(false);
      setSelectedCustomer(null);
      setCreditAdjustment(0);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to adjust credit. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter referrals
  const filteredReferrals = allReferrals.filter((referral) => {
    const matchesSearch =
      searchQuery === "" ||
      referral.referrerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.referredCustomerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.referredCustomerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.referralCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === "all" || referral.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleSettingsSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateSettingsMutation.mutate({
      enabled: programEnabled,
      minimumServicePrice: Math.round(Number(formData.get("minimumServicePrice")) * 100),
      tier1Reward: Math.round(Number(formData.get("tier1Reward")) * 100),
      tier2Reward: Math.round(Number(formData.get("tier2Reward")) * 100),
      tier3Reward: Math.round(Number(formData.get("tier3Reward")) * 100),
    });
  };

  const handleCreditAdjustment = () => {
    if (!selectedCustomer) return;
    
    adjustCreditMutation.mutate({
      customerId: selectedCustomer.customerId,
      amount: Math.round(creditAdjustment * 100), // Convert to cents
    });
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Referral Program</h1>
            <p className="text-muted-foreground">Manage your customer referral program</p>
          </div>
          <Button
            onClick={() => setIsSettingsOpen(true)}
            data-testid="button-program-settings"
          >
            <Settings className="w-4 h-4 mr-2" />
            Program Settings
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-referrals">
                {stats?.totalReferrals || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.pendingReferrals || 0} pending, {stats?.completedReferrals || 0} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-conversion-rate">
                {stats ? stats.conversionRate.toFixed(1) : '0.0'}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pending to completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Awarded</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-credits">
                {formatCurrency(stats?.totalCreditsAwarded || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All-time total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Referrers</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-referrers">
                {topReferrers.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Customers with codes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="referrals" className="w-full">
          <TabsList>
            <TabsTrigger value="referrals" data-testid="tab-all-referrals">All Referrals</TabsTrigger>
            <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">Top Referrers</TabsTrigger>
            <TabsTrigger value="credits" data-testid="tab-credits">Customer Credits</TabsTrigger>
          </TabsList>

          {/* All Referrals Tab */}
          <TabsContent value="referrals" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search by name, email, or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-referrals"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={selectedStatus === "all" ? "default" : "outline"}
                      onClick={() => setSelectedStatus("all")}
                      size="sm"
                      data-testid="button-filter-all"
                    >
                      All
                    </Button>
                    <Button
                      variant={selectedStatus === "pending" ? "default" : "outline"}
                      onClick={() => setSelectedStatus("pending")}
                      size="sm"
                      data-testid="button-filter-pending"
                    >
                      Pending
                    </Button>
                    <Button
                      variant={selectedStatus === "completed" ? "default" : "outline"}
                      onClick={() => setSelectedStatus("completed")}
                      size="sm"
                      data-testid="button-filter-completed"
                    >
                      Completed
                    </Button>
                    <Button
                      variant={selectedStatus === "credited" ? "default" : "outline"}
                      onClick={() => setSelectedStatus("credited")}
                      size="sm"
                      data-testid="button-filter-credited"
                    >
                      Credited
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referrer</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Referred Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Credit</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                        </TableRow>
                      ) : filteredReferrals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">No referrals found</TableCell>
                        </TableRow>
                      ) : (
                        filteredReferrals.map((referral) => (
                          <TableRow key={referral.id} data-testid={`row-referral-${referral.id}`}>
                            <TableCell className="font-medium">{referral.referrerName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" data-testid={`badge-code-${referral.id}`}>
                                {referral.referralCode}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {referral.referredCustomerName || (
                                <span className="text-muted-foreground">Pending</span>
                              )}
                              {referral.referredCustomerEmail && (
                                <div className="text-sm text-muted-foreground">
                                  {referral.referredCustomerEmail}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  referral.status === "credited"
                                    ? "default"
                                    : referral.status === "completed"
                                    ? "secondary"
                                    : "outline"
                                }
                                data-testid={`badge-status-${referral.id}`}
                              >
                                {referral.status}
                              </Badge>
                            </TableCell>
                            <TableCell>Tier {referral.tierLevel}</TableCell>
                            <TableCell>{formatCurrency(referral.creditAmount)}</TableCell>
                            <TableCell>
                              {format(new Date(referral.createdAt), "MMM dd, yyyy")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Referrers Leaderboard */}
          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Referrers Leaderboard</CardTitle>
                <CardDescription>Customers who have referred the most new customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Referral Code</TableHead>
                        <TableHead>Successful Referrals</TableHead>
                        <TableHead>Total Credits Earned</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topReferrers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">No referrers yet</TableCell>
                        </TableRow>
                      ) : (
                        topReferrers.map((referrer, index) => (
                          <TableRow key={referrer.customerId} data-testid={`row-referrer-${index}`}>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                {index === 0 && <span className="text-2xl">🥇</span>}
                                {index === 1 && <span className="text-2xl">🥈</span>}
                                {index === 2 && <span className="text-2xl">🥉</span>}
                                {index > 2 && <span className="text-muted-foreground">#{index + 1}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {referrer.customerName}
                              <div className="text-sm text-muted-foreground">
                                {referrer.customerEmail}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{referrer.referralCode}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {referrer.successfulReferrals}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(referrer.totalCreditsEarned)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Credits Tab */}
          <TabsContent value="credits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Credit Balances</CardTitle>
                <CardDescription>View and manually adjust customer referral credits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Credit Balance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerCredits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">No customer credits yet</TableCell>
                        </TableRow>
                      ) : (
                        customerCredits.map((credit) => (
                          <TableRow key={credit.customerId} data-testid={`row-credit-${credit.customerId}`}>
                            <TableCell className="font-medium">{credit.customerName}</TableCell>
                            <TableCell>{credit.customerEmail}</TableCell>
                            <TableCell>
                              <span className={credit.balance > 0 ? "text-green-600 font-semibold" : ""}>
                                {formatCurrency(credit.balance)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedCustomer(credit);
                                  setCreditAdjustment(0);
                                  setIsCreditAdjustmentOpen(true);
                                }}
                                data-testid={`button-adjust-credit-${credit.customerId}`}
                              >
                                Adjust Credit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Program Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent data-testid="dialog-program-settings">
            <DialogHeader>
              <DialogTitle>Referral Program Settings</DialogTitle>
              <DialogDescription>
                Configure the referral program rewards and requirements
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSettingsSave} className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="program-enabled" className="text-base">Enable Referral Program</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn the entire referral program on or off
                  </p>
                </div>
                <Switch
                  id="program-enabled"
                  checked={programEnabled}
                  onCheckedChange={setProgramEnabled}
                  data-testid="switch-program-enabled"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimumServicePrice">Minimum Service Price</Label>
                <Input
                  id="minimumServicePrice"
                  name="minimumServicePrice"
                  type="number"
                  step="0.01"
                  defaultValue={settings ? (settings.minimumServicePrice / 100).toFixed(2) : "50.00"}
                  data-testid="input-minimum-price"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Minimum booking amount to qualify for referral program
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier1Reward">Tier 1 Reward</Label>
                  <Input
                    id="tier1Reward"
                    name="tier1Reward"
                    type="number"
                    step="0.01"
                    defaultValue={settings ? ((settings.tier1Reward || settings.tier1Amount || 1000) / 100).toFixed(2) : "10.00"}
                    data-testid="input-tier1-reward"
                    required
                  />
                  <p className="text-xs text-muted-foreground">1st referral</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier2Reward">Tier 2 Reward</Label>
                  <Input
                    id="tier2Reward"
                    name="tier2Reward"
                    type="number"
                    step="0.01"
                    defaultValue={settings ? ((settings.tier2Reward || settings.tier2Amount || 1500) / 100).toFixed(2) : "15.00"}
                    data-testid="input-tier2-reward"
                    required
                  />
                  <p className="text-xs text-muted-foreground">2nd referral</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier3Reward">Tier 3+ Reward</Label>
                  <Input
                    id="tier3Reward"
                    name="tier3Reward"
                    type="number"
                    step="0.01"
                    defaultValue={settings ? ((settings.tier3Reward || settings.tier3Amount || 2000) / 100).toFixed(2) : "20.00"}
                    data-testid="input-tier3-reward"
                    required
                  />
                  <p className="text-xs text-muted-foreground">3rd+ referral</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSettingsOpen(false)}
                  data-testid="button-cancel-settings"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Credit Adjustment Dialog */}
        <Dialog open={isCreditAdjustmentOpen} onOpenChange={setIsCreditAdjustmentOpen}>
          <DialogContent data-testid="dialog-credit-adjustment">
            <DialogHeader>
              <DialogTitle>Adjust Customer Credit</DialogTitle>
              <DialogDescription>
                Manually add or remove credits for {selectedCustomer?.customerName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Balance</Label>
                <div className="text-2xl font-bold">
                  {selectedCustomer && formatCurrency(selectedCustomer.balance)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditAdjustment">Adjustment Amount</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCreditAdjustment(Math.max(-100, creditAdjustment - 5))}
                    data-testid="button-decrease-credit"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    id="creditAdjustment"
                    type="number"
                    step="0.01"
                    value={creditAdjustment}
                    onChange={(e) => setCreditAdjustment(Number(e.target.value))}
                    className="text-center"
                    data-testid="input-credit-adjustment"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCreditAdjustment(Math.min(100, creditAdjustment + 5))}
                    data-testid="button-increase-credit"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use negative values to deduct credits, positive to add
                </p>
              </div>

              <div className="space-y-2">
                <Label>New Balance (Preview)</Label>
                <div className="text-2xl font-bold">
                  {selectedCustomer && formatCurrency(selectedCustomer.balance + (creditAdjustment * 100))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreditAdjustmentOpen(false)}
                  data-testid="button-cancel-adjustment"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreditAdjustment}
                  disabled={adjustCreditMutation.isPending || creditAdjustment === 0}
                  data-testid="button-save-adjustment"
                >
                  {adjustCreditMutation.isPending ? "Saving..." : "Apply Adjustment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
