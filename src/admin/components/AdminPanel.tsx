import React, { useState, useEffect, useMemo } from "react";
import * as Icons from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../../shared/firebase";
import PlansAdminTab from "./PlansAdminTab";
import MediaLibraryTab from "./MediaLibraryTab";
import AreaContentTab from "./AreaContentTab";
import PageContentTab from "./PageContentTab";
import {
  Booking,
  BookingStatus,
  AdminActivityEvent,
  CouponRule,
  Review,
  Service,
  Staff,
  Coverage,
  BusinessSettings,
  RecurringPlan,
  Lead,
  LeadStatus,
} from "../../shared/types";
import { 
  fetchAllBookingsForAdmin, 
  updateBookingInFirestore, 
  deleteReviewFromFirestore,
  fetchServicesFromFirestore,
  saveServiceInFirestore,
  deleteServiceFromFirestore,
  fetchStaffFromFirestore,
  saveStaffInFirestore,
  deleteStaffFromFirestore,
  fetchCoverageFromFirestore,
  saveCoverageInFirestore,
  deleteCoverageFromFirestore,
  fetchSettingsFromFirestore,
  saveSettingsInFirestore,
  createReviewInFirestore,
  fetchActivityFromFirestore,
  logAdminActivity,
  fetchCouponsFromFirestore,
  saveCouponInFirestore,
  deleteCouponFromFirestore,
  fetchRecurringPlansForAdmin,
  fetchLeadsForAdmin,
} from "../../shared/services/firebaseService";

interface AdminPanelProps {
  bookings: Booking[];
  reviews: Review[];
  services: Service[];
  currentUser: { uid?: string; email: string; name: string; isAdmin?: boolean } | null;
  onNavigateToAccount?: () => void;
  onUpdateBookingStatus: (
    bookingId: string,
    status: BookingStatus,
    paymentStatus?: 'unpaid' | 'paid' | 'authorized',
    paymentMethod?: 'card' | 'paypal' | 'cash'
  ) => void;
  onDeleteReview?: (reviewId: string) => void;
  onAddReviewDirect?: (review: Review) => void;
  onSynchronizeAll?: () => Promise<void>;
  onExit?: () => void;
}

type SubTabType = 'overview' | 'bookings' | 'services' | 'pricing' | 'payroll' | 'growth' | 'leads' | 'activity' | 'staff' | 'coverage' | 'customers' | 'integrations' | 'settings' | 'reviews' | 'plans' | 'media' | 'areas' | 'pages';

export default function AdminPanel({
  bookings,
  reviews,
  services,
  currentUser,
  onNavigateToAccount,
  onUpdateBookingStatus,
  onDeleteReview,
  onAddReviewDirect,
  onSynchronizeAll,
  onExit
}: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('overview');
  
  // Dynamic collections from Firestore
  const [globalBookings, setGlobalBookings] = useState<Booking[]>(bookings);
  const [globalServices, setGlobalServices] = useState<Service[]>(services);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [coverageList, setCoverageList] = useState<Coverage[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [activityEvents, setActivityEvents] = useState<AdminActivityEvent[]>([]);
  const [couponList, setCouponList] = useState<CouponRule[]>([]);
  const [recurringPlansList, setRecurringPlansList] = useState<RecurringPlan[]>([]);
  const [metricsPeriod, setMetricsPeriod] = useState<'30d' | '90d' | '12mo' | 'all'>('30d');

  // Leads
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [leadsFilter, setLeadsFilter] = useState<LeadStatus | 'all'>('all');
  const [leadsBusy, setLeadsBusy] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  // Payroll
  const [payrollPeriod, setPayrollPeriod] = useState<'current' | 'last' | 'all'>('current');
  const [expandedPayrollStaff, setExpandedPayrollStaff] = useState<string | null>(null);
  const [payrollBusy, setPayrollBusy] = useState<string | null>(null);

  // Photo viewer
  const [photoModalBooking, setPhotoModalBooking] = useState<Booking | null>(null);
  const [photoLightboxIdx,  setPhotoLightboxIdx]  = useState<number | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    id: "business",
    name: "Greenbee Home Services Hub",
    phone: "(800) 555-GREE",
    email: "hola@greenbee.com",
    timezone: "Central Standard Time (CST)",
    bookingEnabled: true,
    stripeMode: "test",
    stripePublishableKey: "",
    googleMapsEnabled: false,
    googleMapsApiKey: "",
    googleMapsAutocompleteEnabled: true,
    googleAuthEnabled: true
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<{ id: string; label: string } | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Staff Form Form States
  const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);
  const [staffFormOpen, setStaffFormOpen] = useState(false);

  // Service Form States
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [newSpecInput, setNewSpecInput] = useState("");

  // Coverage Form States
  const [editingCoverage, setEditingCoverage] = useState<Partial<Coverage> | null>(null);
  const [coverageFormOpen, setCoverageFormOpen] = useState(false);

  // Coupon Form States
  const [editingCoupon, setEditingCoupon] = useState<Partial<CouponRule> | null>(null);
  const [couponFormOpen, setCouponFormOpen] = useState(false);

  // Review Form States
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newServiceId, setNewServiceId] = useState(services[0]?.id || "house-cleaning");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // Load all dynamic data from Firestore
  const loadDatabaseData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      // 1. Bookings
      const bks = await fetchAllBookingsForAdmin();
      if (bks) setGlobalBookings(bks);

      // 2. Services
      const svcs = await fetchServicesFromFirestore();
      if (svcs) setGlobalServices(svcs);

      // 3. Staff
      const st = await fetchStaffFromFirestore();
      if (st) setStaffList(st);

      // 4. Coverage
      const cov = await fetchCoverageFromFirestore();
      if (cov) setCoverageList(cov);

      // 5. Settings
      const setts = await fetchSettingsFromFirestore();
      if (setts) setBusinessSettings(setts);

      // 6. Coupons and admin activity
      const coupons = await fetchCouponsFromFirestore();
      if (coupons) setCouponList(coupons);

      const activity = await fetchActivityFromFirestore();
      if (activity) setActivityEvents(activity);

      // 7. Recurring Plans
      const plans = await fetchRecurringPlansForAdmin();
      if (plans) setRecurringPlansList(plans);

      // 8b. Leads
      const leads = await fetchLeadsForAdmin();
      if (leads) setLeadsList(leads);

      // 8. Registered Customers (from Users collection)
      const usersSnap = await getDocs(collection(db, "users"));
      const users: any[] = [];
      usersSnap.forEach((doc) => {
        users.push(doc.data());
      });
      setCustomersList(users);

    } catch (error: any) {
      console.error("Error loading database documents: ", error);
      setErrorMessage("No se pudieron cargar todos los datos de Firestore. Revisa las reglas de seguridad o tu conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, [bookings]);

  const triggerSuccess = (msg: string) => {
    setErrorMessage("");
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const beginAction = (id: string, label: string) => {
    setPendingAction({ id, label });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const endAction = (id: string) => {
    setPendingAction((current) => current?.id === id ? null : current);
  };

  const isActionPending = (id: string) => pendingAction?.id === id;

  const ActionButtonContent = ({
    actionId,
    idleLabel,
    pendingLabel,
    icon: Icon
  }: {
    actionId: string;
    idleLabel: string;
    pendingLabel: string;
    icon?: React.ElementType;
  }) => {
    const running = isActionPending(actionId);
    const RenderIcon = running ? Icons.RotateCw : Icon;
    return (
      <>
        {RenderIcon && <RenderIcon size={14} className={running ? "animate-spin" : ""} />}
        <span>{running ? pendingLabel : idleLabel}</span>
      </>
    );
  };

  const recordActivity = async (
    event: Omit<AdminActivityEvent, "id" | "actorName" | "actorEmail" | "createdAt">
  ) => {
    const now = new Date().toISOString();
    const activity: AdminActivityEvent = {
      ...event,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actorName: currentUser?.name || "Operador Grenbee",
      actorEmail: currentUser?.email || "admin@grenbee.local",
      createdAt: now
    };

    try {
      await logAdminActivity(activity);
      setActivityEvents((prev) => [activity, ...prev].slice(0, 80));
    } catch (err) {
      console.warn("Admin activity could not be recorded", err);
    }
  };

  const EmptyState = ({
    icon: Icon,
    title,
    description,
    action
  }: {
    icon: React.ElementType;
    title: string;
    description: string;
    action?: React.ReactNode;
  }) => (
    <div className="border border-dashed border-gray-250 bg-white rounded-2xl p-8 text-center space-y-3">
      <div className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
        <Icon size={18} />
      </div>
      <div>
        <h4 className="text-sm font-black text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  );

  // Calculations for stats dashboard
  const stats = useMemo(() => {
    const totalBookings = globalBookings.length;
    const completedBookings = globalBookings.filter(b => b.status === "completed").length;
    const activeBookings = globalBookings.filter(b => b.status !== "completed" && b.status !== "cancelled").length;
    const cancelledBookings = globalBookings.filter(b => b.status === "cancelled").length;

    const totalRevenue = globalBookings
      .filter(b => b.status === "completed" || b.paymentStatus === "paid")
      .reduce((sum, b) => sum + (b.totalCost || 0), 0);

    const averageRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

    const serviceRevenue: Record<string, number> = {};
    globalBookings.forEach(b => {
      const rev = b.totalCost || 0;
      serviceRevenue[b.serviceName] = (serviceRevenue[b.serviceName] || 0) + rev;
    });

    return {
      totalBookings,
      completedBookings,
      activeBookings,
      cancelledBookings,
      totalRevenue,
      averageRating,
      serviceRevenue
    };
  }, [globalBookings, reviews]);

  const payrollRows = useMemo(() => {
    // ── Period bounds ─────────────────────────────────────────────────────────
    const now  = new Date();
    const y    = now.getFullYear();
    const m    = now.getMonth(); // 0-indexed
    let periodStart = "";
    let periodEnd   = "";

    if (payrollPeriod === 'current') {
      periodStart = new Date(y, m, 1).toISOString().slice(0, 10);
      periodEnd   = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    } else if (payrollPeriod === 'last') {
      periodStart = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      periodEnd   = new Date(y, m, 0).toISOString().slice(0, 10);
    }

    const inPeriod = (dateStr: string) =>
      payrollPeriod === 'all' ||
      (dateStr >= periodStart && dateStr <= periodEnd);

    // ── Compute payout per booking ────────────────────────────────────────────
    const calcPayout = (booking: Booking, staff?: Staff): number => {
      if (booking.payoutOverride !== undefined) return booking.payoutOverride;
      const revenue = Number(booking.totalCost || 0);
      const model   = staff?.payoutModel ?? 'percentage';
      const rate    = staff?.payoutRate  ?? 50;
      if (model === 'percentage')    return revenue * (rate / 100);
      if (model === 'fixed_per_job') return rate;
      if (model === 'hourly') {
        // Estimate hours from service estimated duration (not stored on booking — use 2h default)
        return rate * 2;
      }
      return revenue * 0.5; // fallback
    };

    const rows = new Map<string, {
      staffId: string;
      staffName: string;
      payoutModel: string;
      payoutRate: number;
      jobs: number;
      revenue: number;
      payoutDue: number;
      alreadyPaid: number;
      pendingJobs: Booking[];
      paidJobs: Booking[];
      status: "ready" | "unassigned";
      periodStart: string;
      periodEnd: string;
    }>();

    globalBookings
      .filter(b => (b.status === "completed" || b.paymentStatus === "paid") && inPeriod(b.bookingDate || b.createdAt || ""))
      .forEach(b => {
        const staffId   = b.assignedStaffId   || "unassigned";
        const staffName = b.assignedStaffName  || "Sin asignar";
        const staff     = staffList.find(s => s.id === staffId);
        const payout    = calcPayout(b, staff);
        const revenue   = Number(b.totalCost || 0);
        const isPaid    = !!b.payrollPaidAt;

        const existing = rows.get(staffId) ?? {
          staffId,
          staffName,
          payoutModel: staff?.payoutModel ?? 'percentage',
          payoutRate:  staff?.payoutRate  ?? 50,
          jobs: 0, revenue: 0, payoutDue: 0, alreadyPaid: 0,
          pendingJobs: [], paidJobs: [],
          status: staffId === "unassigned" ? ("unassigned" as const) : ("ready" as const),
          periodStart, periodEnd,
        };

        rows.set(staffId, {
          ...existing,
          jobs:        existing.jobs + 1,
          revenue:     existing.revenue + revenue,
          payoutDue:   existing.payoutDue   + (isPaid ? 0 : payout),
          alreadyPaid: existing.alreadyPaid + (isPaid ? payout : 0),
          pendingJobs: isPaid ? existing.pendingJobs : [...existing.pendingJobs, b],
          paidJobs:    isPaid ? [...existing.paidJobs, b] : existing.paidJobs,
        });
      });

    return Array.from(rows.values()).sort((a, b) => b.payoutDue - a.payoutDue);
  }, [globalBookings, staffList, payrollPeriod]);

  const growthSnapshot = useMemo(() => {
    const completed = globalBookings.filter((booking) => booking.status === "completed").length;
    const cancelled = globalBookings.filter((booking) => booking.status === "cancelled").length;
    const recurring = globalBookings.filter((booking) => booking.frequency !== "once").length;
    const paidRevenue = globalBookings
      .filter((booking) => booking.paymentStatus === "paid" || booking.status === "completed")
      .reduce((sum, booking) => sum + Number(booking.totalCost || 0), 0);

    return {
      conversionRate: globalBookings.length ? (completed / globalBookings.length) * 100 : 0,
      cancelRate: globalBookings.length ? (cancelled / globalBookings.length) * 100 : 0,
      recurringRate: globalBookings.length ? (recurring / globalBookings.length) * 100 : 0,
      averageOrderValue: completed ? paidRevenue / completed : 0,
      activeCoupons: couponList.filter((coupon) => coupon.enabled).length,
      servicePerformance: globalServices.map((service) => {
        const serviceBookings = globalBookings.filter((booking) => booking.serviceId === service.id || booking.serviceName === service.name);
        const revenue = serviceBookings.reduce((sum, booking) => sum + Number(booking.totalCost || 0), 0);
        return {
          id: service.id,
          name: service.name,
          bookings: serviceBookings.length,
          revenue
        };
      }).sort((a, b) => b.revenue - a.revenue)
    };
  }, [couponList, globalBookings, globalServices]);

  const metrics = useMemo(() => {
    // ── Period filter ─────────────────────────────────────────────────────────
    const now = new Date();
    const cutoff = new Date(
      metricsPeriod === '30d'  ? now.getTime() - 30  * 86_400_000 :
      metricsPeriod === '90d'  ? now.getTime() - 90  * 86_400_000 :
      metricsPeriod === '12mo' ? now.getTime() - 365 * 86_400_000 :
      0
    );
    const inPeriod = (dateStr: string) =>
      metricsPeriod === 'all' || new Date(dateStr) >= cutoff;

    const periodBookings = globalBookings.filter(b => inPeriod(b.bookingDate || b.createdAt || ''));

    // ── Core KPIs ─────────────────────────────────────────────────────────────
    const completed = periodBookings.filter(b => b.status === 'completed').length;
    const cancelled = periodBookings.filter(b => b.status === 'cancelled').length;
    const paidRevenue = periodBookings
      .filter(b => b.paymentStatus === 'paid' || b.status === 'completed')
      .reduce((s, b) => s + Number(b.totalCost || 0), 0);

    // ── MRR from active recurring plans ───────────────────────────────────────
    const activePlans = recurringPlansList.filter(p => p.status === 'active');
    const mrr = activePlans.reduce((s, p) => {
      const amount = Number(p.amount || 0);
      if (p.recurrence === 'weekly')    return s + amount * 4.33;
      if (p.recurrence === 'bi-weekly') return s + amount * 2.17;
      return s + amount; // monthly
    }, 0);

    const plansByFreq = {
      weekly:    activePlans.filter(p => p.recurrence === 'weekly').length,
      biWeekly:  activePlans.filter(p => p.recurrence === 'bi-weekly').length,
      monthly:   activePlans.filter(p => p.recurrence === 'monthly').length,
    };

    // ── Monthly revenue trend (last 6 calendar months) ────────────────────────
    const monthlyRevenue: { label: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth(); // 0-indexed
      const label = d.toLocaleString('es-MX', { month: 'short', year: '2-digit' });
      const revenue = globalBookings
        .filter(b => {
          const bd = new Date(b.bookingDate || b.createdAt || '');
          return bd.getFullYear() === yr && bd.getMonth() === mo &&
            (b.paymentStatus === 'paid' || b.status === 'completed');
        })
        .reduce((s, b) => s + Number(b.totalCost || 0), 0);
      monthlyRevenue.push({ label, revenue });
    }
    const maxMonthRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1);

    // ── Top customers by revenue ──────────────────────────────────────────────
    const customerRevMap = new Map<string, { name: string; email: string; revenue: number; jobs: number }>();
    periodBookings
      .filter(b => b.paymentStatus === 'paid' || b.status === 'completed')
      .forEach(b => {
        const key = b.email || b.customerName;
        const existing = customerRevMap.get(key) || { name: b.customerName, email: b.email, revenue: 0, jobs: 0 };
        customerRevMap.set(key, {
          ...existing,
          revenue: existing.revenue + Number(b.totalCost || 0),
          jobs: existing.jobs + 1,
        });
      });
    const topCustomers = Array.from(customerRevMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      periodBookings,
      completed,
      cancelled,
      paidRevenue,
      conversionRate: periodBookings.length ? (completed / periodBookings.length) * 100 : 0,
      cancelRate:     periodBookings.length ? (cancelled / periodBookings.length) * 100 : 0,
      aov: completed ? paidRevenue / completed : 0,
      mrr,
      activePlans: activePlans.length,
      plansByFreq,
      monthlyRevenue,
      maxMonthRevenue,
      topCustomers,
      activeCoupons: couponList.filter(c => c.enabled).length,
      servicePerformance: growthSnapshot.servicePerformance,
    };
  }, [globalBookings, recurringPlansList, couponList, growthSnapshot, metricsPeriod]);

  // Filtered Bookings for the dispatcher table
  const filteredBookings = useMemo(() => {
    return globalBookings.filter(b => {
      const matchesSearch = 
        b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [globalBookings, searchTerm, statusFilter]);

  // STAFF ACTIONS
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff?.id || !editingStaff?.name || !editingStaff?.email) return;

    const isNew = !staffList.some(s => s.id === editingStaff.id);
    const actionId = "save-staff";
    beginAction(actionId, "Guardando técnico...");
    try {
      const st: Staff = {
        id:         editingStaff.id,
        name:       editingStaff.name,
        email:      editingStaff.email,
        phone:      editingStaff.phone || "",
        active:     editingStaff.active !== undefined ? editingStaff.active : true,
        serviceIds: editingStaff.serviceIds || [],
        ...(editingStaff.payoutModel ? { payoutModel: editingStaff.payoutModel } : {}),
        ...(editingStaff.payoutRate  !== undefined ? { payoutRate: Number(editingStaff.payoutRate) } : {}),
      };
      await saveStaffInFirestore(st);
      await recordActivity({
        type: "staff_saved",
        entityType: "staff",
        entityId: st.id,
        title: "Personal actualizado",
        detail: `Se guardo el tecnico ${st.name}.`,
        severity: "success"
      });
      triggerSuccess(`Técnico "${st.name}" configurado correctamente en Firestore.`);
      setStaffFormOpen(false);
      setEditingStaff(null);
      await loadDatabaseData();

      // Auto-send invitation email only for newly created staff
      if (isNew) {
        // Fire-and-forget — don't block the form close
        handleSendStaffInvite(st.id, st.name);
      }
    } catch (err: any) {
      setErrorMessage("Error al guardar técnico: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  const handleSendStaffInvite = async (staffId: string, staffName: string) => {
    const actionId = `invite-staff-${staffId}`;
    beginAction(actionId, `Enviando invitación a ${staffName}…`);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("No autenticado");
      const idToken = await firebaseUser.getIdToken();
      const resp = await fetch("/api/invite-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ staffId }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Error al enviar invitación");
      if (data.sent) {
        triggerSuccess(`✉️ Invitación enviada a ${staffName} (${data.email})`);
      } else {
        triggerSuccess(`⚠️ Técnico guardado pero el email no se pudo enviar (RESEND_API_KEY no configurado). El técnico puede entrar a grenbee.com/staff con su cuenta Google de todos modos.`);
      }
    } catch (err: any) {
      setErrorMessage("Error al enviar invitación: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al técnico ${name}?`)) return;
    const actionId = `delete-staff-${id}`;
    beginAction(actionId, "Eliminando técnico...");
    try {
      await deleteStaffFromFirestore(id);
      await recordActivity({
        type: "staff_deleted",
        entityType: "staff",
        entityId: id,
        title: "Personal eliminado",
        detail: `Se elimino el tecnico ${name}.`,
        severity: "warning"
      });
      triggerSuccess(`Técnico "${name}" removido correctamente.`);
      await loadDatabaseData();
    } catch (err: any) {
      setErrorMessage("Error al eliminar técnico: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  // SERVICE ACTIONS
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.id || !editingService?.name || editingService?.basePrice === undefined) return;

    const actionId = "save-service";
    beginAction(actionId, "Guardando servicio...");
    try {
      const svc: Service = {
        id: editingService.id,
        name: editingService.name,
        iconName: editingService.iconName || "Sparkles",
        tagline: editingService.tagline || "",
        description: editingService.description || "",
        basePrice: Number(editingService.basePrice),
        unitName: editingService.unitName || "unidad",
        unitLabel: editingService.unitLabel || "Cantidad de Unidades",
        pricePerUnit: Number(editingService.pricePerUnit || 0),
        minUnits: Number(editingService.minUnits !== undefined ? editingService.minUnits : 1),
        maxUnits: Number(editingService.maxUnits !== undefined ? editingService.maxUnits : 10),
        stepUnits: Number(editingService.stepUnits !== undefined ? editingService.stepUnits : 1),
        estimatedMinutesPerUnit: Number(editingService.estimatedMinutesPerUnit !== undefined ? editingService.estimatedMinutesPerUnit : 30),
        includedSpecs: editingService.includedSpecs || [],
        factors: editingService.factors || [],
        popularUnitValue: Number(editingService.popularUnitValue !== undefined ? editingService.popularUnitValue : 1)
      };
      await saveServiceInFirestore(svc);
      await recordActivity({
        type: "service_saved",
        entityType: "service",
        entityId: svc.id,
        title: "Servicio actualizado",
        detail: `Se guardo el servicio ${svc.name}.`,
        severity: "success"
      });
      triggerSuccess(`Servicio "${svc.name}" guardado exitosamente en Firestore.`);
      setServiceFormOpen(false);
      setEditingService(null);
      await loadDatabaseData();
    } catch (err: any) {
      setErrorMessage("Error al guardar el servicio: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el servicio "${name}"? Esto alterará el flujo público de cotizaciones.`)) return;
    const actionId = `delete-service-${id}`;
    beginAction(actionId, "Eliminando servicio...");
    try {
      await deleteServiceFromFirestore(id);
      await recordActivity({
        type: "service_deleted",
        entityType: "service",
        entityId: id,
        title: "Servicio eliminado",
        detail: `Se elimino el servicio ${name}.`,
        severity: "warning"
      });
      triggerSuccess(`Servicio "${name}" eliminado.`);
      await loadDatabaseData();
    } catch (err: any) {
      setErrorMessage("Error al eliminar servicio: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  // COVERAGES ACTIONS
  const handleSaveCoverage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoverage?.zipCode || !editingCoverage?.city || !editingCoverage?.state) return;

    const actionId = "save-coverage";
    beginAction(actionId, "Guardando cobertura...");
    try {
      const cov: Coverage = {
        zipCode: editingCoverage.zipCode,
        city: editingCoverage.city,
        state: editingCoverage.state,
        active: editingCoverage.active !== undefined ? editingCoverage.active : true
      };
      await saveCoverageInFirestore(cov);
      await recordActivity({
        type: "coverage_saved",
        entityType: "coverage",
        entityId: cov.zipCode,
        title: "ZIP actualizado",
        detail: `Se guardo la zona ${cov.zipCode} (${cov.city}, ${cov.state}).`,
        severity: "success"
      });
      triggerSuccess(`Código ZIP ${cov.zipCode} configurado correctamente.`);
      setCoverageFormOpen(false);
      setEditingCoverage(null);
      await loadDatabaseData();
    } catch (err: any) {
      setErrorMessage("Error al configurar cobertura: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  const handleDeleteCoverage = async (zip: string) => {
    if (!confirm(`¿Estás seguro de deseas remover el ZIP ${zip}?`)) return;
    const actionId = `delete-coverage-${zip}`;
    beginAction(actionId, "Eliminando cobertura...");
    try {
      await deleteCoverageFromFirestore(zip);
      await recordActivity({
        type: "coverage_deleted",
        entityType: "coverage",
        entityId: zip,
        title: "ZIP eliminado",
        detail: `Se elimino la zona ${zip}.`,
        severity: "warning"
      });
      triggerSuccess(`Código ZIP ${zip} eliminado del catálogo.`);
      await loadDatabaseData();
    } catch (err: any) {
      setErrorMessage("Error al eliminar cobertura: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  // GENERAL SETTINGS ACTIONS
  const handleSaveBusinessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const actionId = "save-settings";
    beginAction(actionId, "Guardando ajustes...");
    try {
      await saveSettingsInFirestore(businessSettings);
      await recordActivity({
        type: "settings_saved",
        entityType: "settings",
        entityId: "business",
        title: "Ajustes actualizados",
        detail: "Se guardo la configuracion general de negocio.",
        severity: "success"
      });
      triggerSuccess("Configuración de Greenbee actualizada correctamente en Firestore.");
    } catch (err: any) {
      setErrorMessage("Error al guardar la configuración: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  const handleSaveIntegrationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const actionId = "save-integrations";
    beginAction(actionId, "Guardando integraciones...");
    try {
      await saveSettingsInFirestore(businessSettings);
      await recordActivity({
        type: "integrations_saved",
        entityType: "settings",
        entityId: "business",
        title: "Integraciones actualizadas",
        detail: "Se guardaron las claves publicas y preferencias de integraciones.",
        severity: "success"
      });
      triggerSuccess("Integraciones guardadas correctamente.");
    } catch (err: any) {
      setErrorMessage("Error al guardar integraciones: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  // ASSIGN STAFF TO BOOKING
  const handleAssignStaff = async (bookingId: string, techId: string) => {
    const tech = staffList.find(s => s.id === techId);
    const actionId = `assign-staff-${bookingId}`;
    beginAction(actionId, "Actualizando asignación...");
    try {
      // If none selected, clear assignment
      const updates = {
        assignedStaffId: techId || "",
        assignedStaffName: tech ? tech.name : ""
      };
      await updateBookingInFirestore(bookingId, updates);
      await recordActivity({
        type: "booking_assigned",
        entityType: "booking",
        entityId: bookingId,
        title: "Asignacion de cita actualizada",
        detail: tech ? `Se asigno ${tech.name} a la reserva ${bookingId}.` : `La reserva ${bookingId} quedo sin tecnico asignado.`,
        severity: tech ? "success" : "info"
      });
      triggerSuccess(`Asignación actualizada para reserva ${bookingId}.`);
      await loadDatabaseData();
    } catch (err: any) {
      setErrorMessage("Error al asignar técnico: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  // AUTO-ASSIGN STAFF TO BOOKING
  const handleAutoAssignStaff = async (bookingId: string, force = false) => {
    const actionId = `auto-assign-${bookingId}`;
    beginAction(actionId, "Auto-asignando...");
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("Sesión expirada. Recarga la página.");
      const idToken = await firebaseUser.getIdToken();
      const resp = await fetch("/api/auto-assign-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ bookingId, force }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Auto-asignación fallida.");
      if (data.reason === "no_eligible_staff") {
        triggerSuccess("No hay técnicos disponibles para este servicio en esa fecha.");
      } else {
        await recordActivity({
          type: "booking_assigned",
          entityType: "booking",
          entityId: bookingId,
          title: "Auto-asignación de técnico",
          detail: `Se asignó automáticamente ${data.assignedStaffName || data.assignedStaffId} a la reserva ${bookingId}.`,
          severity: "success",
        });
        triggerSuccess(`Asignado: ${data.assignedStaffName || data.assignedStaffId}`);
        await loadDatabaseData();
      }
    } catch (err: any) {
      setErrorMessage("Error en auto-asignación: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  // DIRECT CREATION OF REVIEWS BY ADMIN
  const handleCreateReviewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthorName || !newComment) return;

    setIsReviewSubmitting(true);
    beginAction("create-review", "Guardando reseña...");
    const reviewPayload: Review = {
      id: `rev-adm-${Date.now()}`,
      serviceId: newServiceId,
      authorName: newAuthorName,
      rating: newRating,
      comment: newComment,
      date: new Date().toISOString().split("T")[0],
      helpfulCount: Math.floor(Math.random() * 5),
      verified: true
    };

    try {
      await createReviewInFirestore(reviewPayload);
      if (onAddReviewDirect) {
        onAddReviewDirect(reviewPayload);
      }
      await recordActivity({
        type: "review_created",
        entityType: "review",
        entityId: reviewPayload.id,
        title: "Resena creada",
        detail: `Se agrego una resena verificada de ${reviewPayload.authorName}.`,
        severity: "success"
      });
      triggerSuccess("¡Reseña certificada inyectada directamente en Firestore!");
      setNewAuthorName("");
      setNewComment("");
    } catch (err: any) {
      setErrorMessage("Error al crear reseña: " + err.message);
    } finally {
      setIsReviewSubmitting(false);
      endAction("create-review");
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon?.code || editingCoupon.value === undefined) return;

    const actionId = "save-coupon";
    beginAction(actionId, "Guardando cupón...");
    const now = new Date().toISOString();
    const code = editingCoupon.code.trim().toUpperCase();
    const couponId = code.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "") || `coupon-${Date.now()}`;
    const coupon: CouponRule = {
      id: couponId,
      code,
      enabled: editingCoupon.enabled !== undefined ? editingCoupon.enabled : true,
      discountType: editingCoupon.discountType || "percent",
      value: Number(editingCoupon.value),
      minimumOrderTotal: Number(editingCoupon.minimumOrderTotal || 0),
      usageLimit: Number(editingCoupon.usageLimit || 0),
      usedCount: Number(editingCoupon.usedCount || 0),
      serviceIds: editingCoupon.serviceIds || [],
      startsAt: editingCoupon.startsAt || "",
      expiresAt: editingCoupon.expiresAt || "",
      createdAt: editingCoupon.createdAt || now,
      updatedAt: now
    };

    try {
      await saveCouponInFirestore(coupon);
      if (editingCoupon.id && editingCoupon.id !== coupon.id) {
        await deleteCouponFromFirestore(editingCoupon.id);
      }
      await recordActivity({
        type: "coupon_saved",
        entityType: "coupon",
        entityId: coupon.id,
        title: "Cupon actualizado",
        detail: `Se guardo el cupon ${coupon.code}.`,
        severity: "success"
      });
      triggerSuccess(`Cupón ${coupon.code} guardado correctamente.`);
      setCouponFormOpen(false);
      setEditingCoupon(null);
      await loadDatabaseData();
    } catch (err: any) {
      setErrorMessage("Error al guardar cupón: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  const handleDeleteCoupon = async (coupon: CouponRule) => {
    if (!confirm(`¿Eliminar permanentemente el cupón ${coupon.code}?`)) return;

    const actionId = `delete-coupon-${coupon.id}`;
    beginAction(actionId, "Eliminando cupón...");
    try {
      await deleteCouponFromFirestore(coupon.id);
      await recordActivity({
        type: "coupon_deleted",
        entityType: "coupon",
        entityId: coupon.id,
        title: "Cupon eliminado",
        detail: `Se elimino el cupon ${coupon.code}.`,
        severity: "warning"
      });
      triggerSuccess(`Cupón ${coupon.code} eliminado.`);
      await loadDatabaseData();
    } catch (err: any) {
      setErrorMessage("Error al eliminar cupón: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  const handleBookingStatusAction = async (
    booking: Booking,
    status: BookingStatus,
    paymentStatus?: 'unpaid' | 'paid' | 'authorized',
    paymentMethod?: 'card' | 'paypal' | 'cash'
  ) => {
    const actionId = `booking-status-${booking.id}-${status}`;
    beginAction(actionId, "Actualizando reserva...");
    try {
      onUpdateBookingStatus(booking.id, status, paymentStatus, paymentMethod);
      await recordActivity({
        type: "booking_status_updated",
        entityType: "booking",
        entityId: booking.id,
        title: "Estado de cita actualizado",
        detail: `${booking.customerName} paso a estado ${status}.`,
        severity: status === "cancelled" ? "warning" : "success"
      });

      // Send status-update email for milestones the customer cares about
      if (status === "dispatched" || status === "completed") {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          firebaseUser.getIdToken().then((idToken) =>
            fetch("/api/notify", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ event: "status_update", bookingId: booking.id }),
            })
          ).catch(() => {/* non-fatal */});
        }
      }

      triggerSuccess(`Reserva ${booking.id} actualizada a ${status}.`);
    } catch (err: any) {
      setErrorMessage("Error al actualizar reserva: " + err.message);
    } finally {
      endAction(actionId);
    }
  };

  // HELPER BADGE FOR OPERATIONS PIPELINE
  const getStatusBadgeClass = (status: BookingStatus) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "dispatched":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "in-progress":
        return "bg-emerald-50 text-emerald-850 border-emerald-100 animate-pulse";
      case "completed":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-100";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans antialiased fixed inset-0 z-50 animate-in fade-in duration-300">
      {/* Sleek, Professional SaaS Admin Left Sidebar */}
      <aside className="w-72 bg-slate-950 text-slate-100 flex flex-col justify-between shrink-0 select-none border-r border-slate-900">
        
        {/* Header with Shield Identity */}
        <div className="p-6 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-brand text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-brand/20">
              <Icons.ShieldCheck size={18} />
            </div>
            <div className="text-left font-sans">
              <span className="text-[9px] bg-brand/10 text-brand border border-brand/20 px-2.5 py-0.5 rounded font-bold tracking-widest uppercase font-mono block w-max">
                Workspace
              </span>
              <span className="text-sm font-black text-white block tracking-tight mt-0.5">
                GreenServe Console
              </span>
            </div>
          </div>
        </div>

        {/* Operator Profile Info */}
        <div className="px-4 pt-4 text-left">
          <div className="space-y-1">
            <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase block px-2.5">
              Operador Autenticado
            </span>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-850 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-slate-800 text-brand flex items-center justify-center text-xs font-black">
                  {currentUser?.name?.charAt(0) || "A"}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white block truncate">{currentUser?.name || "Administrador"}</span>
                  <span className="text-[9px] font-mono text-slate-400 block truncate">{currentUser?.email || "admin@grenbee.local"}</span>
                </div>
              </div>
              <span className="text-[9px] bg-[#0ead6b]/10 text-brand border border-[#0ead6b]/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider inline-block">
                ● Atributo admin=true
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Subtabs list */}
        <div className="flex-1 py-4 px-3 overflow-y-auto text-left space-y-1">
          <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase block px-3.5 mb-2">
            Panel de Operaciones
          </span>
          {[
            { id: "overview", label: "Dashboard", icon: Icons.LayoutDashboard },
            { id: "bookings", label: "Despacho & Citas", icon: Icons.CalendarCheck, badge: filteredBookings.length },
            { id: "services", label: "Servicios", icon: Icons.Sparkles, badge: globalServices.length },
            { id: "pricing", label: "Tarifas & Cupones", icon: Icons.DollarSign, badge: couponList.filter(c => c.enabled).length },
            { id: "payroll", label: "Payroll", icon: Icons.ReceiptText, badge: payrollRows.length },
            { id: "growth", label: "Growth Metrics", icon: Icons.TrendingUp },
            { id: "leads", label: "Leads / CRM", icon: Icons.Inbox, badge: leadsList.filter(l => l.status === 'new').length },
            { id: "activity", label: "Activity Log", icon: Icons.History, badge: activityEvents.length },
            { id: "plans", label: "Membresías", icon: Icons.BadgePercent },
            { id: "media", label: "Media", icon: Icons.Images },
            { id: "areas", label: "Áreas / SEO", icon: Icons.MapPin },
            { id: "pages", label: "Páginas CMS", icon: Icons.LayoutTemplate },
            { id: "staff", label: "Personal / Staff", icon: Icons.Wrench, badge: staffList.length },
            { id: "coverage", label: "Zonas / ZIP", icon: Icons.Map, badge: coverageList.length },
            { id: "customers", label: "Clientes", icon: Icons.Users, badge: customersList.length },
            { id: "reviews", label: "Reseñas", icon: Icons.MessageSquare, badge: reviews.length },
            { id: "integrations", label: "Integraciones", icon: Icons.Plug },
            { id: "settings", label: "Ajustes", icon: Icons.Settings }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as SubTabType);
                  setErrorMessage("");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer outline-none text-left ${
                  isActive
                    ? "bg-[#0ead6b] text-white shadow-md shadow-[#0ead6b]/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TabIcon size={14} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none ${
                    isActive ? "bg-white text-slate-900" : "bg-slate-900 text-slate-400"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer actions */}
        <div className="p-4 border-t border-slate-900 bg-slate-950 space-y-2 text-left">
          {onNavigateToAccount && (
            <button
              onClick={onNavigateToAccount}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border-none rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            >
              <Icons.User size={13} />
              <span>Mi Cuenta de Operador</span>
            </button>
          )}

            <button
              onClick={async () => {
              beginAction("sync-firestore", "Sincronizando Firestore...");
              setIsLoading(true);
              try {
                if (onSynchronizeAll) {
                  await onSynchronizeAll();
                }
                await loadDatabaseData();
                triggerSuccess("Sincronización con base de datos en tiempo real finalizada.");
              } finally {
                endAction("sync-firestore");
              }
            }}
            disabled={isLoading}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-850 disabled:opacity-50 text-slate-300 hover:text-white border-none rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <Icons.RotateCw size={12} className={isLoading ? "animate-spin" : ""} />
            <span>{isActionPending("sync-firestore") ? "Sincronizando..." : "Sincronizar Firestore"}</span>
          </button>

          <button
            onClick={onExit}
            className="w-full py-2 bg-rose-950/40 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border-none rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Icons.LogOut size={12} />
            <span>Cerrar Consola</span>
          </button>
        </div>
      </aside>

      {/* Main content body with Top Header and Dynamic Scroll */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto text-left">
        {(pendingAction || successMessage || errorMessage) && (
          <div className="fixed top-5 right-5 z-[80] w-[min(420px,calc(100vw-2rem))] space-y-2 pointer-events-none">
            {pendingAction && (
              <div className="pointer-events-auto p-3.5 bg-amber-50 text-amber-800 rounded-2xl text-xs font-black flex items-center gap-2 leading-relaxed border border-amber-100 shadow-lg shadow-amber-950/5 animate-in fade-in slide-in-from-top-2 duration-200">
                <Icons.RotateCw size={15} className="animate-spin shrink-0" />
                <span>{pendingAction.label}</span>
              </div>
            )}

            {successMessage && !pendingAction && (
              <div className="pointer-events-auto p-3.5 bg-emerald-50 text-emerald-850 rounded-2xl text-xs font-black flex items-center gap-2 leading-relaxed border border-emerald-100 shadow-lg shadow-emerald-950/5 animate-in fade-in slide-in-from-top-2 duration-200">
                <Icons.CheckCircle size={15} className="text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="pointer-events-auto p-3.5 bg-red-50 text-red-850 rounded-2xl text-xs font-black flex items-center gap-2 leading-relaxed border border-red-100 shadow-lg shadow-red-950/5 animate-in fade-in slide-in-from-top-2 duration-200">
                <Icons.XCircle size={15} className="text-red-600 shrink-0" />
                <span>{errorMessage}</span>
                <button onClick={() => setErrorMessage("")} className="ml-auto text-red-500 hover:text-red-700 bg-transparent border-none outline-none cursor-pointer">Cerrar</button>
              </div>
            )}
          </div>
        )}
        
        {/* Real-time Status Top Bar / Header */}
        <header className="h-16 border-b border-gray-150 bg-white flex items-center justify-between px-6 shrink-0 z-10 select-none">
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-gray-500 tracking-tight flex items-center gap-1">
              <span>Servidores Springfield Local Cluster</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400 font-mono text-[10px]">active_node_firestore</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded font-black font-mono">
              admin=true
            </span>
            <button
              onClick={onExit}
              className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-sm cursor-pointer border-none"
            >
              Salir al Portal Público
            </button>
          </div>
        </header>

        {/* Content canvas padding */}
        <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Breadcrumb / Section Header inside Content Area */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-extrabold uppercase tracking-wide">
                <span>Consola Administrativa</span>
                <span>/</span>
                <span className="text-[#0ead6b]">
                  {[
                    { id: "overview", label: "Dashboard" },
                    { id: "bookings", label: "Despacho & Citas" },
                    { id: "services", label: "Servicios" },
                    { id: "pricing", label: "Tarifas & Cupones" },
                    { id: "payroll", label: "Payroll" },
                    { id: "growth", label: "Growth Metrics" },
                    { id: "leads", label: "Leads / CRM" },
                    { id: "activity", label: "Activity Log" },
                    { id: "plans", label: "Membresías" },
                    { id: "staff", label: "Personal" },
                    { id: "coverage", label: "Zonas / ZIP" },
                    { id: "customers", label: "Clientes" },
                    { id: "reviews", label: "Reseñas" },
                    { id: "integrations", label: "Integraciones" },
                    { id: "settings", label: "Ajustes de Negocio" }
                  ].find(t => t.id === activeSubTab)?.label || "Workspace"}
                </span>
              </div>
              <h2 className="text-xl font-black text-gray-950 tracking-tight mt-0.5">
                {[
                  { id: "overview", val: "Métricas y Rendimiento del Negocio" },
                  { id: "bookings", val: "Despacho y Planificación de Citas" },
                  { id: "services", val: "Catálogo de Servicios y Parámetros" },
                  { id: "pricing", val: "Fórmula de Cotizaciones, Cupones y Tarifas" },
                  { id: "payroll", val: "Resumen de Payouts y Nómina Operativa" },
                  { id: "growth", val: "Funnel, Conversión y Rendimiento Comercial" },
                  { id: "activity", val: "Auditoría de Cambios y Eventos del Sistema" },
                  { id: "staff", val: "Roster de Técnicos de GreenServe" },
                  { id: "coverage", val: "Zonas de Cobertura y Códigos Postales" },
                  { id: "customers", val: "Registro Centralizado de Clientes" },
                  { id: "reviews", val: "Control Moderno de Reseñas / Feedbacks" },
                  { id: "integrations", val: "APIs, Pagos, Mapas y Conectores Externos" },
                  { id: "settings", val: "Ajustes del Sistema y Variables de Negocio" }
                ].find(t => t.id === activeSubTab)?.val || ""}
              </h2>
            </div>
          </div>

          {/* LOADING SPINNER SHIELD */}
          {isLoading && (
            <div className="py-24 text-center space-y-3">
              <Icons.RotateCw size={36} className="animate-spin text-[#0ead6b] mx-auto" />
              <p className="text-xs text-gray-500 font-bold font-mono">Estableciendo comunicación segura con Cloud Firestore...</p>
            </div>
          )}

      {/* 1. OVERVIEW GRAPHICS & METRICS TAB */}
      {!isLoading && activeSubTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2 text-left shadow-xs">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold block">Ingresos Facturados</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-brand font-sans">${stats.totalRevenue.toLocaleString()}</span>
                <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded uppercase font-mono">USD</span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">Suma de reservas completadas o pagadas.</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2 text-left shadow-xs">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold block">Reservas Totales</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-gray-950 font-sans">{stats.totalBookings}</span>
                <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">Histórico</span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">{stats.activeBookings} activas en el tablero.</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2 text-left shadow-xs">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold block">Calificación de Clientes</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-amber-500 font-sans">{stats.averageRating} ★</span>
                <span className="text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded uppercase">Satisfacción</span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium font-semibold">Promedio de {reviews.length} testimonios.</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2 text-left shadow-xs">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold block">Personal Operativo</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-purple-650 font-sans">{staffList.filter(s => s.active).length}</span>
                <span className="text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded uppercase">Activos</span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">De un roster total de {staffList.length} técnicos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 p-6 space-y-5 text-left shadow-xs">
              <div>
                <h3 className="font-extrabold text-sm text-gray-950">Ingresos por Categoría de Servicio</h3>
                <p className="text-[10px] text-gray-500">Distribución de cotizaciones finalizadas y pagadas por tipo de labor.</p>
              </div>

              <div className="space-y-4">
                {Object.entries(stats.serviceRevenue).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No hay transacciones guardadas en Firestore.</p>
                ) : (
                  Object.entries(stats.serviceRevenue).map(([serviceName, amount]) => {
                    const numAmount = amount as number;
                    const pct = stats.totalRevenue > 0 ? (numAmount / stats.totalRevenue) * 100 : 0;
                    return (
                      <div key={serviceName} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-gray-700">{serviceName}</span>
                          <span className="text-gray-950 font-bold">${numAmount.toLocaleString()} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="bg-brand h-full rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="lg:col-span-5 bg-stone-900 text-stone-100 rounded-2xl p-6 space-y-4 text-left shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-5 opacity-10">
                <Icons.Layers size={110} />
              </div>
              <span className="text-[9px] bg-brand text-stone-950 px-2.5 py-0.5 font-bold uppercase rounded self-start tracking-wider">
                Infraestructura Activa
              </span>
              <h4 className="text-base font-black tracking-tight mt-1">Reglas de Negocio en Tiempo Real</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                A diferencia de un sitio estático, esta consola privada te permite modular y persistir toda la información en las colecciones seguras de Firestore.
              </p>
              <div className="space-y-3 font-medium text-xs">
                <div className="flex gap-2.5 items-start">
                  <Icons.Users size={14} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-[11px]">Asignación de Personal</strong>
                    <span className="text-stone-350 text-[11px]">Vincula técnicos especialistas a reservas ingresadas para control de despacho.</span>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <Icons.Sparkles size={14} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-[11px]">Catálogo Autoadministrable</strong>
                    <span className="text-stone-350 text-[11px]">Guarda nuevos servicios, modifica precios base y edita la prueba social instantáneamente.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DISPATCH & BOOKINGS MANAGEMENT TAB */}
      {!isLoading && activeSubTab === 'bookings' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 md:p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-grow max-w-sm">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente, dirección o ID..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-250 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1 select-none text-[10px] font-bold">
              {[
                { id: "all", label: "Todas" },
                { id: "scheduled", label: "Programado" },
                { id: "dispatched", label: "En Camino" },
                { id: "in-progress", label: "En Curso" },
                { id: "completed", label: "Completo" },
                { id: "cancelled", label: "Cancelado" }
              ].map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setStatusFilter(tag.id)}
                  className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                    statusFilter === tag.id
                      ? "bg-stone-950 text-white border-stone-950"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-55"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-120">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-extrabold border-b border-gray-120 uppercase font-mono tracking-wider text-[9px]">
                  <th className="p-4">Cliente / ID</th>
                  <th className="p-4">Servicio Contratado</th>
                  <th className="p-4">Fecha & Hora</th>
                  <th className="p-4">Importe / Pago</th>
                  <th className="p-4">Estatus Técnico</th>
                  <th className="p-4">Operador Asignado</th>
                  <th className="p-4 text-right">Controles Operativos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-400 italic">
                      No hay citas configuradas con el filtro actual.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50/55 transition-colors">
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900 leading-none">{booking.customerName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{booking.id}</p>
                          <p className="text-[10px] text-gray-500 font-medium truncate max-w-[130px]">{booking.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-800 leading-none">{booking.serviceName}</p>
                          <span className="text-[9px] bg-brand-light text-brand px-1 py-0.2 rounded font-extrabold uppercase select-none tracking-wider font-mono">
                            {booking.frequency}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900 leading-none">{booking.bookingDate}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{booking.timeSlot}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="font-black text-gray-950 text-sm leading-none">${booking.totalCost}</p>
                          {booking.paymentStatus === "paid" ? (
                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded uppercase font-mono">
                              Pagado
                            </span>
                          ) : (
                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-900/10 rounded uppercase font-mono">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-full uppercase tracking-wider ${getStatusBadgeClass(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <select
                            value={(booking as any).assignedStaffId || ""}
                            onChange={(e) => handleAssignStaff(booking.id, e.target.value)}
                            disabled={isActionPending(`assign-staff-${booking.id}`) || isActionPending(`auto-assign-${booking.id}`)}
                            className="text-[11px] font-bold p-1 border border-gray-200 rounded-lg bg-white max-w-[130px] outline-none text-gray-800 disabled:opacity-60 disabled:cursor-wait"
                          >
                            <option value="">-- Sin Asignar --</option>
                            {staffList.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} {st.active ? "" : "(Inactivo)"}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAutoAssignStaff(booking.id, !!(booking as any).assignedStaffId)}
                            disabled={isActionPending(`auto-assign-${booking.id}`) || isActionPending(`assign-staff-${booking.id}`)}
                            title={(booking as any).assignedStaffId ? "Re-asignar automáticamente" : "Auto-asignar técnico"}
                            className="p-1 rounded-md border border-gray-200 bg-white hover:bg-teal-50 hover:border-teal-300 disabled:opacity-50 disabled:cursor-wait text-teal-600 transition-colors cursor-pointer shrink-0"
                          >
                            {isActionPending(`auto-assign-${booking.id}`)
                              ? <Icons.RotateCw size={11} className="animate-spin" />
                              : <Icons.Wand2 size={11} />
                            }
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-1 justify-end">
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <>
                              <button
                                onClick={() => handleBookingStatusAction(booking, 'dispatched')}
                                title="Despachar técnico"
                                disabled={isActionPending(`booking-status-${booking.id}-dispatched`)}
                                className="p-1 rounded-md border border-gray-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-wait text-amber-600 transition-colors cursor-pointer"
                              >
                                {isActionPending(`booking-status-${booking.id}-dispatched`) ? (
                                  <Icons.RotateCw size={12} className="animate-spin" />
                                ) : (
                                  <Icons.Truck size={12} />
                                )}
                              </button>
                              <button
                                onClick={() => handleBookingStatusAction(booking, 'in-progress')}
                                title="Fijar en camino"
                                disabled={isActionPending(`booking-status-${booking.id}-in-progress`)}
                                className="p-1 rounded-md border border-gray-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-wait text-emerald-600 transition-colors cursor-pointer"
                              >
                                {isActionPending(`booking-status-${booking.id}-in-progress`) ? (
                                  <Icons.RotateCw size={12} className="animate-spin" />
                                ) : (
                                  <Icons.Wrench size={12} />
                                )}
                              </button>
                              <button
                                onClick={() => handleBookingStatusAction(booking, 'completed', 'paid')}
                                title="Completar y pagar"
                                disabled={isActionPending(`booking-status-${booking.id}-completed`)}
                                className="p-1 rounded-md border border-brand bg-brand-light hover:bg-brand hover:text-white disabled:opacity-50 disabled:cursor-wait text-brand transition-colors cursor-pointer"
                              >
                                {isActionPending(`booking-status-${booking.id}-completed`) ? (
                                  <Icons.RotateCw size={12} className="animate-spin" />
                                ) : (
                                  <Icons.Check size={12} />
                                )}
                              </button>
                            </>
                          )}
                          {/* Photos button */}
                          <button
                            onClick={() => setPhotoModalBooking(booking)}
                            title={`Ver fotos (${(booking.photos ?? []).length})`}
                            className="p-1 rounded-md border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-indigo-500 transition-colors cursor-pointer relative"
                          >
                            <Icons.Camera size={12} />
                            {(booking.photos ?? []).length > 0 && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">
                                {(booking.photos ?? []).length}
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              if (confirm("¿Cancelar esta reserva en Firestore?")) {
                                handleBookingStatusAction(booking, 'cancelled');
                              }
                            }}
                            title="Cancelar reserva"
                            disabled={isActionPending(`booking-status-${booking.id}-cancelled`)}
                            className="p-1 rounded-md border border-gray-200 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-wait text-red-650 transition-colors cursor-pointer"
                          >
                            {isActionPending(`booking-status-${booking.id}-cancelled`) ? (
                              <Icons.RotateCw size={12} className="animate-spin" />
                            ) : (
                              <Icons.XCircle size={12} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SERVICES CRUD TAB */}
      {!isLoading && activeSubTab === 'services' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center text-left">
            <div>
              <h3 className="font-extrabold text-sm text-gray-950">Catálogo de Servicios de Springfield</h3>
              <p className="text-[10px] text-gray-500 font-medium">Modifica los servicios del frontend que los usuarios pueden cotizar.</p>
            </div>
            <button
              onClick={() => {
                setEditingService({
                  id: "nuevo-servicio-" + Math.floor(Math.random() * 100),
                  name: "",
                  basePrice: 50,
                  iconName: "Sparkles",
                  tagline: "",
                  description: "",
                  unitName: "unidad",
                  unitLabel: "Cantidad de Unidades",
                  pricePerUnit: 10,
                  minUnits: 1,
                  maxUnits: 10,
                  stepUnits: 1,
                  estimatedMinutesPerUnit: 30,
                  includedSpecs: [],
                  factors: [],
                  popularUnitValue: 1
                });
                setServiceFormOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border-none"
            >
              <Icons.Plus size={13} />
              <span>Añadir Servicio</span>
            </button>
          </div>

          {/* Form Modal/Section */}
          {serviceFormOpen && editingService && (
            <form onSubmit={handleSaveService} className="bg-amber-50/40 border border-amber-200 rounded-2xl p-6 text-left space-y-4 animate-in slide-in-from-top-3 duration-250">
              <div className="flex justify-between items-center border-b border-amber-200 pb-2.5">
                <h4 className="font-black text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1">
                  <Icons.Edit3 size={12} />
                  <span>Configurar Ficha de Servicio</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setServiceFormOpen(false);
                    setEditingService(null);
                  }}
                  className="text-amber-800 hover:text-amber-950 bg-transparent border-none text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">ID Identificador (Código único)</label>
                  <input
                    type="text"
                    required
                    disabled={globalServices.some(s => s.id === editingService.id)}
                    value={editingService.id || ""}
                    onChange={(e) => setEditingService({ ...editingService, id: e.target.value })}
                    placeholder="ej: drywall-repair"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Nombre Público</label>
                  <input
                    type="text"
                    required
                    value={editingService.name || ""}
                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                    placeholder="ej: Drywall Repair"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Icono Lucide</label>
                  <select
                    value={editingService.iconName ?? "Sparkles"}
                    onChange={(e) => setEditingService({ ...editingService, iconName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  >
                    <option value="Sparkles">Sparkles (Estrellas)</option>
                    <option value="Tv">Tv (Televisor)</option>
                    <option value="Scissors">Scissors (Tijeras/Corte)</option>
                    <option value="Hammer">Hammer (Martillo/Armado)</option>
                    <option value="ShowerHead">ShowerHead (Lavado/Agua)</option>
                    <option value="Home">Home (Hogar)</option>
                    <option value="Wrench">Wrench (Llave/Mantenimiento)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Tagline de Presentación</label>
                  <input
                    type="text"
                    value={editingService.tagline || ""}
                    onChange={(e) => setEditingService({ ...editingService, tagline: e.target.value })}
                    placeholder="ej: Reparación profesional para muros y techos..."
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Precio Base ($)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingService.basePrice ?? 0}
                    onChange={(e) => setEditingService({ ...editingService, basePrice: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-500">Descripción Larga del Servicio</label>
                <textarea
                  rows={2}
                  value={editingService.description || ""}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="Escribe todo el alcance y detalle de esta categoría..."
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Nombre de Unidad</label>
                  <input
                    type="text"
                    value={editingService.unitName ?? "unidad"}
                    onChange={(e) => setEditingService({ ...editingService, unitName: e.target.value })}
                    placeholder="ej: m2, pieza"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Etiqueta de Unidad</label>
                  <input
                    type="text"
                    value={editingService.unitLabel ?? "Unidades"}
                    onChange={(e) => setEditingService({ ...editingService, unitLabel: e.target.value })}
                    placeholder="ej: Metros cuadrados..."
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Precio por Unidad ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingService.pricePerUnit ?? 0}
                    onChange={(e) => setEditingService({ ...editingService, pricePerUnit: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Valor Popular</label>
                  <input
                    type="number"
                    value={editingService.popularUnitValue ?? 1}
                    onChange={(e) => setEditingService({ ...editingService, popularUnitValue: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Specs array editor */}
              <div className="space-y-2 border-t pt-2.5">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Especificaciones Incluidas en Cita</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSpecInput}
                    onChange={(e) => setNewSpecInput(e.target.value)}
                    placeholder="ej: Lijado fino final impermeable"
                    className="flex-grow text-xs p-2 rounded-xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSpecInput.trim()) return;
                      const specs = editingService.includedSpecs || [];
                      setEditingService({ ...editingService, includedSpecs: [...specs, newSpecInput.trim()] });
                      setNewSpecInput("");
                    }}
                    className="px-3 bg-amber-600 text-white rounded-xl text-xs font-bold border-none cursor-pointer hover:bg-amber-700"
                  >
                    Añadir
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(editingService.includedSpecs || []).map((spec, i) => (
                    <span key={spec + i} className="bg-stone-900 text-white px-2 py-0.5 text-[10px] rounded flex items-center gap-1 font-medium select-none">
                      <span>{spec}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const filter = (editingService.includedSpecs || []).filter((_, index) => index !== i);
                          setEditingService({ ...editingService, includedSpecs: filter });
                        }}
                        className="text-red-400 font-extrabold cursor-pointer border-none bg-transparent hover:text-red-600 ml-1 outline-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isActionPending("save-service")}
                className="w-full py-2.5 bg-stone-900 border-none hover:bg-stone-950 disabled:opacity-70 disabled:cursor-wait text-white text-xs font-black rounded-xl transition-all shadow-md mt-4 cursor-pointer flex items-center justify-center gap-2"
              >
                <ActionButtonContent
                  actionId="save-service"
                  idleLabel="Grabar Catálogo de Servicio en Firestore"
                  pendingLabel="Guardando servicio..."
                  icon={Icons.Save}
                />
              </button>
            </form>
          )}

          {/* Grid list of services */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {globalServices.length === 0 ? (
              <div className="md:col-span-2 lg:col-span-3">
                <EmptyState
                  icon={Icons.Sparkles}
                  title="No hay servicios activos"
                  description="El catalogo puede quedar vacio. Agrega un servicio cuando quieras volver a habilitar cotizaciones publicas."
                />
              </div>
            ) : globalServices.map((svc) => (
              <div key={svc.id} className="bg-white border border-gray-150 rounded-2xl p-5 text-left flex flex-col justify-between shadow-2xs group relative">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <span className="font-mono text-[10px] text-gray-400 font-bold uppercase">{svc.id}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditingService(svc);
                          setServiceFormOpen(true);
                        }}
                        className="text-neutral-500 hover:text-brand bg-transparent border-none p-1 shrink-0 cursor-pointer"
                        title="Editar"
                      >
                        <Icons.Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteService(svc.id, svc.name)}
                        disabled={isActionPending(`delete-service-${svc.id}`)}
                        className="text-neutral-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-wait bg-transparent border-none p-1 shrink-0 cursor-pointer"
                        title="Borrar"
                      >
                        {isActionPending(`delete-service-${svc.id}`) ? (
                          <Icons.RotateCw size={13} className="animate-spin" />
                        ) : (
                          <Icons.Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="py-4 space-y-2">
                    <h4 className="font-extrabold text-sm text-gray-900">{svc.name}</h4>
                    <p className="text-[11px] text-gray-400 leading-normal font-semibold italic">"{svc.tagline}"</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed truncate-2-lines line-clamp-2">{svc.description}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-400 text-[10px] block font-medium">Cotización Inicial</span>
                    <span className="font-black text-brand text-sm">${svc.basePrice} base</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 text-[10px] block font-medium">Adicional por {svc.unitName}</span>
                    <span className="font-bold text-gray-800">${svc.pricePerUnit} / {svc.unitName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. PRICING & TIER MODIFIERS TAB */}
      {!isLoading && activeSubTab === 'pricing' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-left space-y-6 animate-in fade-in duration-200">
          <div>
            <span className="text-[9px] bg-emerald-600 text-white font-extrabold uppercase px-2 py-0.5 rounded tracking-wider font-mono">
              COBRANZAS & CALCULADORA
            </span>
            <h3 className="font-extrabold text-sm text-gray-950 mt-1">Reglas de Tarificación y Multiplicadores de Springfield</h3>
            <p className="text-[10px] text-gray-500 font-medium">Configuración matemática de los importes y bonificaciones para cálculo de presupuestos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4 border border-gray-150 p-5 rounded-2xl bg-gray-50/50">
              <span className="text-xs font-black text-stone-900 border-b pb-1.5 block">1. Descuentos por Frecuencia de Turnos</span>
              <p className="text-[11px] text-gray-500 leading-normal">
                El motor público aplica disminuciones en el costo final según la frecuencia contratada por el suscriptor:
              </p>
              
              <div className="space-y-2 text-xs font-semibold">
                <div className="flex justify-between items-center py-2 bg-white border border-gray-100 rounded-xl px-3 shadow-3xs">
                  <span className="text-gray-600">Servicio Único (Once)</span>
                  <span className="text-gray-900 font-bold">Precio Regular (Sin descuento)</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-white border border-gray-100 rounded-xl px-3 shadow-3xs">
                  <span className="text-gray-600">Frecuencia Semanal (Weekly)</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded uppercase font-mono text-[10px]">-15% Descuento</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-white border border-gray-100 rounded-xl px-3 shadow-3xs">
                  <span className="text-gray-600">Frecuencia Quincenal (Bi-Weekly)</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded uppercase font-mono text-[10px]">-15% Descuento</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-white border border-gray-100 rounded-xl px-3 shadow-3xs">
                  <span className="text-gray-600">Frecuencia Mensual (Monthly)</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded uppercase font-mono text-[10px]">-10% Descuento</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 border border-gray-150 p-5 rounded-2xl bg-gray-50/50">
              <span className="text-xs font-black text-stone-900 border-b pb-1.5 block">2. Membresías & Club Greenbee VIP</span>
              <p className="text-[11px] text-gray-500 leading-normal">
                Disminución directa basada en el club de membresía del perfil del cliente (puede modificarse en el perfil del usuario):
              </p>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs bg-white p-3 border border-gray-100 rounded-xl shadow-3xs">
                  <div>
                    <span className="font-extrabold text-stone-900 block text-[11px]">VIP Premium Master</span>
                    <span className="text-[10px] text-gray-450 block">Descuento del 15% inmediato en todas las reservas.</span>
                  </div>
                  <span className="font-black text-amber-600 font-mono">-15%</span>
                </div>
                <div className="flex justify-between items-center text-xs bg-white p-3 border border-gray-100 rounded-xl shadow-3xs">
                  <div>
                    <span className="font-extrabold text-stone-900 block text-[11px]">VIP Regular</span>
                    <span className="text-[10px] text-gray-450 block">Descuento del 8% fijo en cotizaciones de reparaciones.</span>
                  </div>
                  <span className="font-black text-amber-600 font-mono">-8%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-950">Cupones conectables</h3>
                <p className="text-[10px] text-gray-500 font-medium">
                  Estos registros ya viven en Firestore. El checkout publico puede conectarse luego a esta coleccion para validar descuentos.
                </p>
              </div>
              <button
                onClick={() => {
                  const now = new Date().toISOString();
                  setEditingCoupon({
                    id: "",
                    code: "",
                    enabled: true,
                    discountType: "percent",
                    value: 10,
                    minimumOrderTotal: 0,
                    usageLimit: 0,
                    usedCount: 0,
                    serviceIds: [],
                    startsAt: "",
                    expiresAt: "",
                    createdAt: now,
                    updatedAt: now
                  });
                  setCouponFormOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border-none"
              >
                <Icons.Plus size={13} />
                <span>Nuevo Cupón</span>
              </button>
            </div>

            {couponFormOpen && editingCoupon && (
              <form onSubmit={handleSaveCoupon} className="bg-amber-50/40 border border-amber-200 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                  <span className="font-black text-xs uppercase tracking-wider text-amber-900">Configurar cupón</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCouponFormOpen(false);
                      setEditingCoupon(null);
                    }}
                    className="text-amber-800 hover:text-amber-950 bg-transparent border-none text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    Código
                    <input
                      required
                      type="text"
                      value={editingCoupon.code || ""}
                      onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                      placeholder="SPRING10"
                      className="mt-1 w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                    />
                  </label>
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    Tipo
                    <select
                      value={editingCoupon.discountType || "percent"}
                      onChange={(e) => setEditingCoupon({ ...editingCoupon, discountType: e.target.value as CouponRule["discountType"] })}
                      className="mt-1 w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                    >
                      <option value="percent">Porcentaje</option>
                      <option value="fixed">Monto fijo</option>
                    </select>
                  </label>
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    Valor
                    <input
                      required
                      min={0}
                      type="number"
                      value={editingCoupon.value ?? 0}
                      onChange={(e) => setEditingCoupon({ ...editingCoupon, value: Number(e.target.value) })}
                      className="mt-1 w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                    />
                  </label>
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    Mínimo
                    <input
                      min={0}
                      type="number"
                      value={editingCoupon.minimumOrderTotal ?? 0}
                      onChange={(e) => setEditingCoupon({ ...editingCoupon, minimumOrderTotal: Number(e.target.value) })}
                      className="mt-1 w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                    />
                  </label>
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    Límite de uso
                    <input
                      min={0}
                      type="number"
                      value={editingCoupon.usageLimit ?? 0}
                      onChange={(e) => setEditingCoupon({ ...editingCoupon, usageLimit: Number(e.target.value) })}
                      className="mt-1 w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    Activo desde
                    <input
                      type="date"
                      value={(editingCoupon.startsAt || "").slice(0, 10)}
                      onChange={(e) => setEditingCoupon({ ...editingCoupon, startsAt: e.target.value })}
                      className="mt-1 w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                    />
                  </label>
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    Expira
                    <input
                      type="date"
                      value={(editingCoupon.expiresAt || "").slice(0, 10)}
                      onChange={(e) => setEditingCoupon({ ...editingCoupon, expiresAt: e.target.value })}
                      className="mt-1 w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-gray-500">Servicios aplicables</span>
                  <div className="flex flex-wrap gap-2">
                    {globalServices.map((service) => {
                      const selected = (editingCoupon.serviceIds || []).includes(service.id);
                      return (
                        <label key={service.id} className={`text-[10px] font-bold rounded-lg border px-2 py-1 cursor-pointer ${selected ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-gray-200 text-gray-500"}`}>
                          <input
                            type="checkbox"
                            className="mr-1"
                            checked={selected}
                            onChange={(e) => {
                              const current = editingCoupon.serviceIds || [];
                              setEditingCoupon({
                                ...editingCoupon,
                                serviceIds: e.target.checked
                                  ? [...current, service.id]
                                  : current.filter((id) => id !== service.id)
                              });
                            }}
                          />
                          {service.name}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400">Si no seleccionas servicios, el cupón queda disponible para todos cuando se conecte al checkout.</p>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={editingCoupon.enabled !== undefined ? editingCoupon.enabled : true}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, enabled: e.target.checked })}
                  />
                  <span>Cupón activo</span>
                </label>

                <button
                  type="submit"
                  disabled={isActionPending("save-coupon")}
                  className="w-full py-2.5 bg-stone-900 border-none hover:bg-stone-950 disabled:opacity-70 disabled:cursor-wait text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <ActionButtonContent
                    actionId="save-coupon"
                    idleLabel="Guardar cupón en Firestore"
                    pendingLabel="Guardando cupón..."
                    icon={Icons.Save}
                  />
                </button>
              </form>
            )}

            {couponList.length === 0 ? (
              <EmptyState
                icon={Icons.Ticket}
                title="No hay cupones configurados"
                description="Puedes dejarlo vacío sin que el sistema regenere datos. Cuando el checkout se conecte, leerá esta colección."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {couponList.map((coupon) => (
                  <article key={coupon.id} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-sm font-black text-gray-950">{coupon.code}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {coupon.discountType === "percent" ? `${coupon.value}% descuento` : `$${coupon.value} descuento fijo`}
                        </p>
                      </div>
                      <span className={`text-[8px] font-black uppercase rounded-full px-2 py-0.5 ${coupon.enabled ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                        {coupon.enabled ? "Activo" : "Pausado"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 space-y-1">
                      <p>Mínimo: <strong>${coupon.minimumOrderTotal}</strong></p>
                      <p>Uso: <strong>{coupon.usedCount}</strong>{coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : " / ilimitado"}</p>
                      <p>Servicios: <strong>{coupon.serviceIds.length ? coupon.serviceIds.length : "Todos"}</strong></p>
                    </div>
                    <div className="flex justify-end gap-1.5 border-t border-gray-50 pt-2">
                      <button
                        onClick={() => {
                          setEditingCoupon(coupon);
                          setCouponFormOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-brand bg-transparent border-none cursor-pointer"
                        title="Editar cupón"
                      >
                        <Icons.Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon)}
                        disabled={isActionPending(`delete-coupon-${coupon.id}`)}
                        className="p-1 text-gray-400 hover:text-red-650 disabled:opacity-50 disabled:cursor-wait bg-transparent border-none cursor-pointer"
                        title="Eliminar cupón"
                      >
                        {isActionPending(`delete-coupon-${coupon.id}`) ? (
                          <Icons.RotateCw size={13} className="animate-spin" />
                        ) : (
                          <Icons.Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PAYROLL TAB */}
      {!isLoading && activeSubTab === 'payroll' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* ── Period selector ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-gray-950">Nómina de técnicos</h2>
              <p className="text-[10px] text-gray-400">Payout calculado según las reglas de pago de cada técnico.</p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(['current', 'last', 'all'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPayrollPeriod(p)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border-none cursor-pointer transition-colors ${
                    payrollPeriod === p
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p === 'current' ? 'Mes actual' : p === 'last' ? 'Mes anterior' : 'Todo'}
                </button>
              ))}
            </div>
          </div>

          {/* ── KPI strip ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold block">Payout pendiente</span>
              <strong className="text-2xl font-black text-brand">
                ${payrollRows.reduce((s, r) => s + r.payoutDue, 0).toLocaleString()}
              </strong>
              <p className="text-[10px] text-gray-500 mt-1">Jobs aún no marcados como pagados.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold block">Ya pagado</span>
              <strong className="text-2xl font-black text-emerald-600">
                ${payrollRows.reduce((s, r) => s + r.alreadyPaid, 0).toLocaleString()}
              </strong>
              <p className="text-[10px] text-gray-500 mt-1">Payouts marcados como procesados.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold block">Revenue período</span>
              <strong className="text-2xl font-black text-gray-950">
                ${payrollRows.reduce((s, r) => s + r.revenue, 0).toLocaleString()}
              </strong>
              <p className="text-[10px] text-gray-500 mt-1">Completadas o pagadas.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold block">Sin asignar</span>
              <strong className="text-2xl font-black text-amber-600">
                {payrollRows.filter(r => r.status === "unassigned").reduce((s, r) => s + r.jobs, 0)}
              </strong>
              <p className="text-[10px] text-gray-500 mt-1">Revisar antes de cerrar nómina.</p>
            </div>
          </div>

          {/* ── Per-staff expandable rows ─────────────────────────────────────── */}
          {payrollRows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs">
              <EmptyState icon={Icons.ReceiptText} title="No hay pagos en este período" description="Cuando existan reservas completadas con staff asignado aparecerán aquí." />
            </div>
          ) : (
            <div className="space-y-3">
              {payrollRows.map(row => {
                const isExpanded = expandedPayrollStaff === row.staffId;
                const modelLabel =
                  row.payoutModel === 'percentage'    ? `${row.payoutRate}%`          :
                  row.payoutModel === 'fixed_per_job' ? `$${row.payoutRate}/job`       :
                  row.payoutModel === 'hourly'        ? `$${row.payoutRate}/h`         : '50%';

                return (
                  <div key={row.staffId} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                    {/* ── Summary row ── */}
                    <button
                      type="button"
                      onClick={() => setExpandedPayrollStaff(isExpanded ? null : row.staffId)}
                      className="w-full text-left p-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors border-none bg-transparent cursor-pointer"
                    >
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-brand/10 text-brand font-black text-xs flex items-center justify-center shrink-0">
                          {row.staffName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-gray-900 truncate">{row.staffName}</p>
                          <p className="text-[10px] text-gray-400">{row.jobs} job{row.jobs !== 1 ? 's' : ''} · modelo: <span className="font-bold text-gray-600">{modelLabel}</span></p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right hidden sm:block">
                        <p className="text-[10px] text-gray-400">Revenue</p>
                        <p className="text-sm font-bold text-gray-700">${row.revenue.toLocaleString()}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-gray-400">Payout pendiente</p>
                        <p className="text-base font-black text-brand">${row.payoutDue.toFixed(2)}</p>
                      </div>
                      {row.pendingJobs.length > 0 && row.status !== 'unassigned' && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const token = await auth.currentUser?.getIdToken();
                            if (!token) return;
                            setPayrollBusy(row.staffId);
                            try {
                              await fetch('/api/set-job-payout', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ staffId: row.staffId, markPaid: true, periodStart: row.periodStart, periodEnd: row.periodEnd }),
                              });
                              triggerSuccess(`Nómina de ${row.staffName} marcada como pagada.`);
                              await loadDatabaseData();
                            } catch {
                              setErrorMessage('Error al cerrar nómina.');
                            } finally {
                              setPayrollBusy(null);
                            }
                          }}
                          disabled={payrollBusy === row.staffId}
                          className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          {payrollBusy === row.staffId ? <Icons.Loader2 size={12} className="animate-spin" /> : <Icons.CheckCircle size={12} />}
                          Marcar pagado
                        </button>
                      )}
                      <Icons.ChevronDown size={16} className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* ── Expanded job list ── */}
                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {row.pendingJobs.length === 0 && row.paidJobs.length === 0 ? (
                          <p className="p-4 text-xs text-gray-400">No hay jobs en este período.</p>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-[9px] uppercase text-gray-400 font-black">
                              <tr>
                                <th className="px-4 py-2">Fecha</th>
                                <th className="px-4 py-2">Cliente</th>
                                <th className="px-4 py-2">Servicio</th>
                                <th className="px-4 py-2">Revenue</th>
                                <th className="px-4 py-2">Payout</th>
                                <th className="px-4 py-2">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {[...row.pendingJobs, ...row.paidJobs].map(b => {
                                const staff = staffList.find(s => s.id === row.staffId);
                                const payout = b.payoutOverride !== undefined ? b.payoutOverride :
                                  row.payoutModel === 'percentage'    ? Number(b.totalCost||0) * (row.payoutRate/100) :
                                  row.payoutModel === 'fixed_per_job' ? row.payoutRate :
                                  row.payoutRate * 2; // hourly × 2h
                                return (
                                  <tr key={b.id} className={`hover:bg-gray-50/60 ${b.payrollPaidAt ? 'opacity-50' : ''}`}>
                                    <td className="px-4 py-2 font-mono text-gray-500">{b.bookingDate}</td>
                                    <td className="px-4 py-2 font-bold text-gray-900 max-w-[120px] truncate">{b.customerName}</td>
                                    <td className="px-4 py-2 text-gray-600 max-w-[100px] truncate">{b.serviceName}</td>
                                    <td className="px-4 py-2 font-mono">${Number(b.totalCost||0).toFixed(2)}</td>
                                    <td className="px-4 py-2 font-black text-brand">
                                      {b.payoutOverride !== undefined
                                        ? <span className="text-violet-600">${b.payoutOverride.toFixed(2)} ✎</span>
                                        : `$${payout.toFixed(2)}`}
                                    </td>
                                    <td className="px-4 py-2">
                                      {b.payrollPaidAt
                                        ? <span className="text-[8px] bg-emerald-50 text-emerald-700 font-black uppercase rounded-full px-2 py-0.5">Pagado</span>
                                        : <span className="text-[8px] bg-amber-50 text-amber-700 font-black uppercase rounded-full px-2 py-0.5">Pendiente</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Payout model legend ──────────────────────────────────────────── */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs text-stone-500 space-y-1">
            <p className="font-bold text-stone-700 text-[11px]">Modelos de pago disponibles (configura en la pestaña Staff)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              {[
                { icon: Icons.Percent, label: "Porcentaje", desc: "% del revenue del job. Ej: 50% → $100 job = $50 payout." },
                { icon: Icons.Hash,    label: "Tarifa fija/job", desc: "Monto fijo por job completado, sin importar el precio." },
                { icon: Icons.Clock,   label: "Por hora", desc: "Tarifa horaria × horas estimadas (2h por defecto)." },
              ].map(m => (
                <div key={m.label} className="flex gap-2 items-start">
                  <m.icon size={12} className="text-brand mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-stone-600">{m.label}</p>
                    <p className="leading-tight">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 6. GROWTH METRICS TAB */}
      {!isLoading && activeSubTab === 'growth' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* ── Period selector ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-gray-950">Business Metrics</h2>
              <p className="text-[10px] text-gray-400">Revenue, recurrencia y retención de clientes.</p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(['30d', '90d', '12mo', 'all'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setMetricsPeriod(p)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border-none cursor-pointer transition-colors ${
                    metricsPeriod === p
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p === '30d' ? '30 días' : p === '90d' ? '90 días' : p === '12mo' ? '12 meses' : 'Todo'}
                </button>
              ))}
            </div>
          </div>

          {/* ── KPI cards row ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Ingresos",      value: `$${metrics.paidRevenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, note: "Período seleccionado",     icon: Icons.DollarSign,    color: "text-emerald-600" },
              { label: "MRR",           value: `$${metrics.mrr.toFixed(0)}`,                                                    note: "Planes activos",           icon: Icons.RefreshCw,     color: "text-brand" },
              { label: "Planes activos",value: String(metrics.activePlans),                                                     note: "weekly · bi-weekly · monthly", icon: Icons.Repeat2,  color: "text-indigo-600" },
              { label: "Conversión",    value: `${metrics.conversionRate.toFixed(1)}%`,                                         note: "Completadas / reservas",    icon: Icons.TrendingUp,    color: "text-sky-600" },
              { label: "Ticket prom.",  value: `$${metrics.aov.toFixed(0)}`,                                                    note: "Revenue / completadas",     icon: Icons.ReceiptText,   color: "text-violet-600" },
              { label: "Cupones activos",value: String(metrics.activeCoupons),                                                  note: "Habilitados en el sistema", icon: Icons.Tag,           color: "text-amber-600" },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-col gap-1">
                <m.icon size={14} className={m.color} />
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-extrabold">{m.label}</span>
                <strong className="text-xl font-black text-gray-950 leading-none">{m.value}</strong>
                <p className="text-[9px] text-gray-400 leading-tight">{m.note}</p>
              </div>
            ))}
          </div>

          {/* ── Revenue trend chart + Recurring plan breakdown ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Monthly revenue bars */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-gray-950">Revenue mensual</h3>
                <p className="text-[10px] text-gray-400">Últimos 6 meses · reservas pagadas o completadas.</p>
              </div>
              {metrics.maxMonthRevenue <= 0 ? (
                <EmptyState icon={Icons.BarChart2} title="Sin datos de revenue" description="Las reservas pagadas futuras alimentarán este gráfico." />
              ) : (
                <div className="flex items-end gap-2 h-32">
                  {metrics.monthlyRevenue.map(m => {
                    const pct = Math.max(4, (m.revenue / metrics.maxMonthRevenue) * 100);
                    return (
                      <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[8px] font-bold text-gray-500 leading-none">
                          {m.revenue > 0 ? `$${(m.revenue / 1000).toFixed(1)}k` : '–'}
                        </span>
                        <div className="w-full relative" style={{ height: '80px' }}>
                          <div
                            className="absolute bottom-0 w-full bg-brand rounded-t-md transition-all duration-500"
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[8px] text-gray-400 font-bold">{m.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Recurring plan breakdown */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-gray-950">Planes recurrentes activos</h3>
                <p className="text-[10px] text-gray-400">MRR = weekly×4.33 + bi-weekly×2.17 + monthly×1.</p>
              </div>
              {metrics.activePlans === 0 ? (
                <EmptyState icon={Icons.Repeat2} title="Sin planes activos" description="Los clientes que elijan un servicio recurrente aparecerán aquí." />
              ) : (
                <div className="space-y-4">
                  {[
                    { key: 'weekly',    label: 'Semanal (weekly)',          count: metrics.plansByFreq.weekly,   multiplier: 4.33 },
                    { key: 'bi-weekly', label: 'Quincenal (bi-weekly)',     count: metrics.plansByFreq.biWeekly, multiplier: 2.17 },
                    { key: 'monthly',   label: 'Mensual (monthly)',         count: metrics.plansByFreq.monthly,  multiplier: 1    },
                  ].map(row => {
                    const pct = metrics.activePlans > 0 ? Math.round((row.count / metrics.activePlans) * 100) : 0;
                    return (
                      <div key={row.key} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{row.label}</span>
                          <span className="text-gray-500">{row.count} plan{row.count !== 1 ? 'es' : ''} · {pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
                    <span className="text-gray-500 font-bold">MRR estimado</span>
                    <span className="font-black text-brand">${metrics.mrr.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ── Service performance + Top customers ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Service performance */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-gray-950">Performance por servicio</h3>
                <p className="text-[10px] text-gray-400">Participación en revenue total · todos los períodos.</p>
              </div>
              {metrics.servicePerformance.every(r => r.bookings === 0) ? (
                <EmptyState icon={Icons.TrendingUp} title="Sin datos de performance" description="Las reservas futuras alimentarán este tablero automáticamente." />
              ) : (
                <div className="space-y-3">
                  {metrics.servicePerformance.map(row => {
                    const pct = stats.totalRevenue > 0 ? Math.min(100, (row.revenue / stats.totalRevenue) * 100) : 0;
                    return (
                      <div key={row.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{row.name}</span>
                          <span className="text-gray-500">{row.bookings} jobs · ${row.revenue.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Top customers */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-gray-950">Top clientes</h3>
                <p className="text-[10px] text-gray-400">Por revenue en el período seleccionado.</p>
              </div>
              {metrics.topCustomers.length === 0 ? (
                <EmptyState icon={Icons.Users} title="Sin datos de clientes" description="Los clientes con reservas pagadas aparecerán aquí." />
              ) : (
                <div className="space-y-3">
                  {metrics.topCustomers.map((c, i) => (
                    <div key={c.email} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{c.name}</p>
                        <p className="text-[9px] text-gray-400 truncate">{c.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-brand">${c.revenue.toLocaleString()}</p>
                        <p className="text-[9px] text-gray-400">{c.jobs} job{c.jobs !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

        </div>
      )}

      {/* 7. LEADS / CRM TAB */}
      {!isLoading && activeSubTab === 'leads' && (() => {
        const filtered  = leadsFilter === 'all' ? leadsList : leadsList.filter(l => l.status === leadsFilter);
        const newCount  = leadsList.filter(l => l.status === 'new').length;
        const contacted = leadsList.filter(l => l.status === 'contacted').length;
        const recovered = leadsList.filter(l => l.status === 'recovered').length;
        const lost      = leadsList.filter(l => l.status === 'lost').length;

        const statusColor: Record<string, string> = {
          new:       'bg-blue-50 text-blue-700 border-blue-200',
          contacted: 'bg-amber-50 text-amber-700 border-amber-200',
          recovered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          lost:      'bg-rose-50 text-rose-600 border-rose-200',
        };

        const handleLeadStatus = async (leadId: string, status: LeadStatus) => {
          const token = await auth.currentUser?.getIdToken();
          if (!token) return;
          setLeadsBusy(leadId);
          try {
            const resp = await fetch('/api/update-lead', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ leadId, status }),
            });
            if (resp.ok) {
              setLeadsList(prev => prev.map(l => l.id === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l));
              triggerSuccess(`Lead marcado como "${status}".`);
            }
          } finally { setLeadsBusy(null); }
        };

        const handleWebhookTest = async () => {
          if (!webhookUrl) return;
          setLeadsBusy('webhook-test');
          try {
            await fetch('/api/update-lead', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await auth.currentUser?.getIdToken()}` },
              body:    JSON.stringify({ leadId: '__test__', _webhookTest: true, webhookUrl }),
            });
          } finally { setLeadsBusy(null); }
        };

        return (
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Nuevos',     count: newCount,  color: 'text-blue-600',    bg: 'bg-blue-50'    },
                { label: 'Contactados',count: contacted, color: 'text-amber-600',   bg: 'bg-amber-50'   },
                { label: 'Recuperados',count: recovered, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Perdidos',   count: lost,      color: 'text-rose-500',    bg: 'bg-rose-50'    },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-2xl border border-white p-4 shadow-xs`}>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold block">{s.label}</span>
                  <strong className={`text-2xl font-black ${s.color}`}>{s.count}</strong>
                </div>
              ))}
            </div>

            {/* Filters + CRM webhook URL */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(['all', 'new', 'contacted', 'recovered', 'lost'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setLeadsFilter(f)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border-none cursor-pointer transition-colors capitalize ${
                      leadsFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => loadDatabaseData()}
                className="ml-auto p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer border-solid"
                title="Recargar leads"
              >
                <Icons.RefreshCw size={13} />
              </button>
            </div>

            {/* Leads table */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-xs">
                <Icons.Inbox size={32} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm font-bold text-gray-400">No hay leads {leadsFilter !== 'all' ? `con estado "${leadsFilter}"` : 'todavía'}</p>
                <p className="text-xs text-gray-300 mt-1">Los leads se crean automáticamente cuando un cliente llega al paso de pago y no completa la reserva.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-[9px] uppercase text-gray-400 font-black">
                    <tr>
                      <th className="p-3">Cliente</th>
                      <th className="p-3 hidden sm:table-cell">Servicio</th>
                      <th className="p-3 hidden md:table-cell">Valor est.</th>
                      <th className="p-3 hidden lg:table-cell">Fecha</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-50/60">
                        <td className="p-3">
                          <p className="font-bold text-gray-900 truncate max-w-[140px]">{lead.customerName}</p>
                          <p className="text-[10px] text-gray-400 truncate">{lead.email}</p>
                          {lead.phone && <p className="text-[10px] text-gray-400">{lead.phone}</p>}
                        </td>
                        <td className="p-3 hidden sm:table-cell text-gray-600 truncate max-w-[120px]">{lead.serviceName || '—'}</td>
                        <td className="p-3 hidden md:table-cell font-bold text-gray-700">
                          {lead.estimatedValue ? `$${Number(lead.estimatedValue).toFixed(0)}` : '—'}
                        </td>
                        <td className="p-3 hidden lg:table-cell text-gray-400 font-mono">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-3">
                          <span className={`text-[8px] font-black uppercase rounded-full px-2 py-0.5 border ${statusColor[lead.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {lead.status}
                          </span>
                          {lead.convertedBookingId && (
                            <p className="text-[8px] text-emerald-600 font-bold mt-0.5">→ {lead.convertedBookingId}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {lead.status === 'new' && (
                              <button
                                disabled={leadsBusy === lead.id}
                                onClick={() => handleLeadStatus(lead.id, 'contacted')}
                                className="px-2 py-1 text-[9px] font-black bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg border-none cursor-pointer disabled:opacity-60 transition-colors"
                              >Contactar</button>
                            )}
                            {(lead.status === 'new' || lead.status === 'contacted') && (
                              <button
                                disabled={leadsBusy === lead.id}
                                onClick={() => handleLeadStatus(lead.id, 'recovered')}
                                className="px-2 py-1 text-[9px] font-black bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg border-none cursor-pointer disabled:opacity-60 transition-colors"
                              >Recuperado</button>
                            )}
                            {lead.status !== 'lost' && lead.status !== 'recovered' && (
                              <button
                                disabled={leadsBusy === lead.id}
                                onClick={() => handleLeadStatus(lead.id, 'lost')}
                                className="px-2 py-1 text-[9px] font-black bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-lg border-none cursor-pointer disabled:opacity-60 transition-colors"
                              >Perdido</button>
                            )}
                            {leadsBusy === lead.id && <Icons.Loader2 size={12} className="animate-spin text-gray-400 mt-1" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CRM Webhook config */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-2">
                  <Icons.Webhook size={14} className="text-brand" /> CRM Webhook
                </h3>
                <p className="text-[10px] text-gray-400">Recibe eventos de leads en Zapier, Make, HubSpot o cualquier webhook. Configura la URL en Ajustes.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-[10px] font-mono text-gray-500 space-y-1">
                <p className="font-black text-gray-700 text-xs mb-1">Eventos enviados:</p>
                {['lead.contacted', 'lead.recovered', 'lead.lost', 'lead.recovery_email_sent'].map(e => (
                  <div key={e} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                    {e}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">
                URL actual: <span className="font-bold text-gray-600">{businessSettings.crmWebhookUrl || 'No configurada — ir a Ajustes'}</span>
              </p>
            </section>

          </div>
        );
      })()}

      {/* 8. ACTIVITY LOG TAB */}
      {!isLoading && activeSubTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden animate-in fade-in duration-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-gray-950">Activity Log</h3>
              <p className="text-[10px] text-gray-500">Auditoría conectada a Firestore para cambios del admin y eventos futuros.</p>
            </div>
            <button
              onClick={() => recordActivity({
                type: "system_checkpoint",
                entityType: "system",
                entityId: "manual-checkpoint",
                title: "Checkpoint manual",
                detail: "El operador registro una marca de control desde el Activity Log.",
                severity: "info"
              })}
              className="px-3 py-1.5 text-xs font-bold bg-stone-900 text-white rounded-xl border-none cursor-pointer flex items-center gap-1.5"
            >
              <Icons.Plus size={12} />
              <span>Checkpoint</span>
            </button>
          </div>
          {activityEvents.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={Icons.History} title="Todavía no hay actividad" description="A partir de ahora, los cambios importantes del admin quedarán registrados aquí." />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activityEvents.map((event) => {
                const ActivityIcon = event.severity === "warning" ? Icons.AlertTriangle : event.severity === "error" ? Icons.XCircle : event.severity === "success" ? Icons.CheckCircle : Icons.Info;
                return (
                  <article key={event.id} className="p-4 flex gap-3 hover:bg-gray-50/70">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${event.severity === "warning" ? "bg-amber-50 text-amber-700" : event.severity === "error" ? "bg-red-50 text-red-700" : event.severity === "success" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                      <ActivityIcon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <h4 className="text-xs font-black text-gray-950">{event.title}</h4>
                        <span className="text-[10px] text-gray-400 font-mono">{new Date(event.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{event.detail}</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">{event.actorEmail} · {event.entityType}/{event.entityId}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. STAFF CRUD TAB */}
      {!isLoading && activeSubTab === 'staff' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center text-left">
            <div>
              <h3 className="font-extrabold text-sm text-gray-950">Especialistas & Roster Técnico</h3>
              <p className="text-[10px] text-gray-400 font-medium">Operarios autorizados de Springfield para visitas domiciliares y finalización de servicios.</p>
            </div>
            <button
              onClick={() => {
                setEditingStaff({
                  id: "st-" + Math.floor(Math.random() * 1000),
                  name: "",
                  email: "",
                  phone: "",
                  active: true,
                  serviceIds: []
                });
                setStaffFormOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border-none animate-in fade-in"
            >
              <Icons.Plus size={13} />
              <span>Añadir Miembro de Staff</span>
            </button>
          </div>

          {/* Form Editor */}
          {staffFormOpen && editingStaff && (
            <form onSubmit={handleSaveStaff} className="bg-amber-50/40 border border-amber-200 rounded-2xl p-6 text-left space-y-4 animate-in slide-in-from-top-3 duration-200">
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1">
                  <Icons.UserPlus size={13} />
                  <span>Configurar Registro Técnico</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setStaffFormOpen(false);
                    setEditingStaff(null);
                  }}
                  className="text-amber-800 hover:text-amber-950 bg-transparent border-none text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">ID Técnico (Prefijado)</label>
                  <input
                    type="text"
                    required
                    disabled={staffList.some(s => s.id === editingStaff.id)}
                    value={editingStaff.id || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, id: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.name || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    placeholder="ej: Santiago Mendieta"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Email Corporativo</label>
                  <input
                    type="email"
                    required
                    value={editingStaff.email || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    placeholder="ej: santiago.m@greenbee.com"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Celular de Contacto</label>
                  <input
                    type="text"
                    value={editingStaff.phone || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    placeholder="ej: (555) 019-3388"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-500 block mb-2">Especialidades del Servicio</span>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto bg-white p-3 rounded-xl border border-gray-200">
                    {globalServices.map((svc) => {
                      const isSpecialist = (editingStaff.serviceIds || []).includes(svc.id);
                      return (
                        <label key={svc.id} className="flex items-center gap-2 text-xs font-bold text-gray-700 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSpecialist}
                            onChange={(e) => {
                              const currIds = editingStaff.serviceIds || [];
                              const nextIds = e.target.checked
                                ? [...currIds, svc.id]
                                : currIds.filter(id => id !== svc.id);
                              setEditingStaff({ ...editingStaff, serviceIds: nextIds });
                            }}
                            className="rounded border-gray-300 text-brand focus:ring-brand"
                          />
                          <span>{svc.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-black uppercase text-gray-500 block mb-2">Estatus Laboral</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold select-none text-gray-800">
                    <input
                      type="checkbox"
                      checked={editingStaff.active !== undefined ? editingStaff.active : true}
                      onChange={(e) => setEditingStaff({ ...editingStaff, active: e.target.checked })}
                      className="rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span>Disponible para despacho de citas (Estatus Activo)</span>
                  </label>
                </div>
              </div>

              {/* Payout rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-200">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-gray-500">Modelo de pago</label>
                  <select
                    value={editingStaff?.payoutModel ?? 'percentage'}
                    onChange={(e) => setEditingStaff({ ...editingStaff!, payoutModel: e.target.value as any })}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold bg-white"
                  >
                    <option value="percentage">Porcentaje del revenue</option>
                    <option value="fixed_per_job">Tarifa fija por job</option>
                    <option value="hourly">Tarifa por hora</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-gray-500">
                    {(editingStaff?.payoutModel ?? 'percentage') === 'percentage'
                      ? 'Porcentaje (0–100)'
                      : (editingStaff?.payoutModel ?? 'percentage') === 'fixed_per_job'
                      ? 'Monto fijo por job ($)'
                      : 'Tarifa por hora ($)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={(editingStaff?.payoutModel ?? 'percentage') === 'percentage' ? 1 : 0.01}
                    max={(editingStaff?.payoutModel ?? 'percentage') === 'percentage' ? 100 : undefined}
                    value={editingStaff?.payoutRate ?? ((editingStaff?.payoutModel ?? 'percentage') === 'percentage' ? 50 : 0)}
                    onChange={(e) => setEditingStaff({ ...editingStaff!, payoutRate: Number(e.target.value) })}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isActionPending("save-staff")}
                className="w-full py-2.5 bg-stone-900 border-none hover:bg-stone-950 disabled:opacity-70 disabled:cursor-wait text-white text-xs font-black rounded-xl transition-all shadow flex items-center justify-center gap-2"
              >
                <ActionButtonContent
                  actionId="save-staff"
                  idleLabel="Grabar Registro Técnico en Firestore"
                  pendingLabel="Guardando técnico..."
                  icon={Icons.Save}
                />
              </button>
            </form>
          )}

          {/* staff list table */}
          <div className="bg-white border rounded-xl overflow-hidden border-gray-150">
            <table className="w-full text-left text-xs text-gray-700 font-medium">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-extrabold border-b border-gray-120 uppercase font-mono tracking-wider text-[9px]">
                  <th className="p-4">Identidad / ID</th>
                  <th className="p-4">Credenciales</th>
                  <th className="p-4">Número de Soporte</th>
                  <th className="p-4">Área de Especialidad</th>
                  <th className="p-4">Estatus</th>
                  <th className="p-4 text-right">Controles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-405 italic">
                      No hay personal registrado en Firestore.
                    </td>
                  </tr>
                ) : (
                  staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-gray-900">{st.name}</td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-800">{st.email}</p>
                          <p className="text-[10px] text-gray-450 font-mono">{st.id}</p>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-gray-650">{st.phone || "Sin teléfono"}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(st.serviceIds || []).map((srvId) => {
                            const matchSrv = globalServices.find(g => g.id === srvId);
                            return (
                              <span key={srvId} className="bg-gray-100 text-gray-750 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                {matchSrv ? matchSrv.name : srvId}
                              </span>
                            );
                          })}
                          {(st.serviceIds || []).length === 0 && (
                            <span className="text-[10px] text-gray-400 italic">Soporte General</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {st.active ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                            Activo
                          </span>
                        ) : (
                          <span className="bg-red-50 text-red-750 border border-red-105 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                            Inactivo / De Vacaciones
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end items-center">
                          {/* Send / resend invitation */}
                          <button
                            onClick={() => handleSendStaffInvite(st.id, st.name)}
                            disabled={isActionPending(`invite-staff-${st.id}`)}
                            title={`Enviar invitación a ${st.email}`}
                            className="text-gray-450 hover:text-brand disabled:opacity-50 disabled:cursor-wait bg-transparent border-none outline-none cursor-pointer"
                          >
                            {isActionPending(`invite-staff-${st.id}`) ? (
                              <Icons.RotateCw size={13} className="animate-spin" />
                            ) : (
                              <Icons.Mail size={13} />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingStaff(st);
                              setStaffFormOpen(true);
                            }}
                            className="text-gray-450 hover:text-brand bg-transparent border-none outline-none cursor-pointer"
                          >
                            <Icons.Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(st.id, st.name)}
                            disabled={isActionPending(`delete-staff-${st.id}`)}
                            className="text-gray-405 hover:text-red-600 disabled:opacity-50 disabled:cursor-wait bg-transparent border-none outline-none cursor-pointer"
                          >
                            {isActionPending(`delete-staff-${st.id}`) ? (
                              <Icons.RotateCw size={13} className="animate-spin" />
                            ) : (
                              <Icons.Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLANS TAB */}
      {!isLoading && activeSubTab === 'plans' && (
        <PlansAdminTab />
      )}

      {/* MEDIA LIBRARY TAB */}
      {!isLoading && activeSubTab === 'media' && (
        <MediaLibraryTab />
      )}

      {/* AREAS / SEO TAB */}
      {!isLoading && activeSubTab === 'areas' && (
        <AreaContentTab />
      )}

      {/* PAGES CMS TAB */}
      {!isLoading && activeSubTab === 'pages' && (
        <PageContentTab />
      )}

      {/* 6. COVERAGE CRUD TAB */}
      {!isLoading && activeSubTab === 'coverage' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center text-left">
            <div>
              <h3 className="font-extrabold text-sm text-gray-950">Zonas de Cobertura de Springfield</h3>
              <p className="text-[10px] text-gray-400 font-medium">Configura qué distritos y códigos ZIP de Illinois están habilitados para cotizar y recibir operarios.</p>
            </div>
            <button
              onClick={() => {
                setEditingCoverage({
                  zipCode: "",
                  city: "",
                  state: "IL",
                  active: true
                });
                setCoverageFormOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border-none"
            >
              <Icons.Plus size={13} />
              <span>Añadir Código ZIP</span>
            </button>
          </div>

          {coverageFormOpen && editingCoverage && (
            <form onSubmit={handleSaveCoverage} className="bg-amber-50/40 border border-amber-200 rounded-2xl p-5 text-left space-y-4 animate-in slide-in-from-top-3 duration-200">
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="font-black text-xs uppercase tracking-wider text-amber-900">
                  Configurar Regla de Localidad (SPRINGFIELD REGION)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCoverageFormOpen(false);
                    setEditingCoverage(null);
                  }}
                  className="text-amber-800 hover:text-amber-950 bg-transparent border-none text-xs font-bold cursor-pointer font-mono"
                >
                  cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Código Postal (ZIP Code)</label>
                  <input
                    type="text"
                    required
                    value={editingCoverage.zipCode || ""}
                    onChange={(e) => setEditingCoverage({ ...editingCoverage, zipCode: e.target.value })}
                    placeholder="ej: 62706"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Ciudad / Distrito</label>
                  <input
                    type="text"
                    required
                    value={editingCoverage.city || ""}
                    onChange={(e) => setEditingCoverage({ ...editingCoverage, city: e.target.value })}
                    placeholder="ej: Springfield West"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 block mb-1">Estado</label>
                  <input
                    type="text"
                    required
                    value={editingCoverage.state ?? "IL"}
                    onChange={(e) => setEditingCoverage({ ...editingCoverage, state: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-250 bg-white"
                  />
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 mb-3 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={editingCoverage.active !== undefined ? editingCoverage.active : true}
                      onChange={(e) => setEditingCoverage({ ...editingCoverage, active: e.target.checked })}
                      className="rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span>Estatus Habilitado</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isActionPending("save-coverage")}
                className="w-full py-2.5 bg-stone-900 border-none hover:bg-stone-950 disabled:opacity-70 disabled:cursor-wait text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ActionButtonContent
                  actionId="save-coverage"
                  idleLabel="Grabar Cobertura Geográfica en Firestore"
                  pendingLabel="Guardando cobertura..."
                  icon={Icons.Save}
                />
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {coverageList.length === 0 ? (
              <div className="col-span-2 md:col-span-4">
                <EmptyState
                  icon={Icons.Map}
                  title="No hay ZIPs de cobertura"
                  description="La zona puede quedar completamente vacia. Agrega codigos ZIP solo cuando quieras abrir cotizaciones en esa localidad."
                />
              </div>
            ) : coverageList.map((cov) => (
              <div key={cov.zipCode} className="bg-white border text-left p-4.5 rounded-2xl flex justify-between items-center shadow-3xs hover:border-brand transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-stone-900 font-mono tracking-tight">{cov.zipCode}</span>
                    <Icons.Navigation2 size={12} className="text-gray-400 rotate-45" />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase truncate max-w-[120px]">{cov.city}, {cov.state}</p>
                  <span className={`text-[8px] font-extrabold px-1.5 rounded-full uppercase inline-block mt-2 ${cov.active ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-750"}`}>
                    {cov.active ? "Activo" : "Suspendido"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setEditingCoverage(cov);
                      setCoverageFormOpen(true);
                    }}
                    className="p-1 hover:text-brand bg-transparent border-none text-gray-405 cursor-pointer"
                  >
                    <Icons.Edit3 size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteCoverage(cov.zipCode)}
                    disabled={isActionPending(`delete-coverage-${cov.zipCode}`)}
                    className="p-1 hover:text-red-650 disabled:opacity-50 disabled:cursor-wait bg-transparent border-none text-gray-405 cursor-pointer"
                  >
                    {isActionPending(`delete-coverage-${cov.zipCode}`) ? (
                      <Icons.RotateCw size={12} className="animate-spin" />
                    ) : (
                      <Icons.Trash2 size={12} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. CUSTOMERS BROWSER TAB */}
      {!isLoading && activeSubTab === 'customers' && (
        <div className="bg-white border rounded-xl overflow-hidden border-gray-150 animate-in fade-in duration-200">
          <div className="p-5 border-b text-left">
            <h3 className="font-extrabold text-sm text-gray-950">Clientes Registrados</h3>
            <p className="text-[10px] text-gray-400 mt-1 font-medium">Cuentas y perfiles registrados por el público general, incluyendo preferencias de mascotas e ingreso a locaciones.</p>
          </div>

          <table className="w-full text-left text-xs text-gray-700 font-medium">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-extrabold border-b border-gray-120 uppercase font-mono tracking-wider text-[9px]">
                <th className="p-4">Usuario</th>
                <th className="p-4">Correo Electrónico</th>
                <th className="p-4">Contacto Telefónico</th>
                <th className="p-4">Dirección Domiciliaria</th>
                <th className="p-4">Membresía / Club</th>
                <th className="p-4">Mascotas en Casa</th>
                <th className="p-4">Acceso de Llave</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customersList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                    Sin clientes registrados actualmente en Firestore.
                  </td>
                </tr>
              ) : (
                customersList.map((cust) => (
                  <tr key={cust.uid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{cust.name || "Sin nombre registrado"}</td>
                    <td className="p-4 text-gray-600 font-medium font-mono text-[11px]">{cust.email}</td>
                    <td className="p-4 text-stone-700 font-semibold">{cust.phone || "Sin teléfono"}</td>
                    <td className="p-4 truncate max-w-[150px]" title={cust.address}>
                      {cust.address || "No especificado"}
                    </td>
                    <td className="p-4">
                      {cust.activeMembership ? (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide">
                          {cust.activeMembership}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Estándar</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-gray-700 font-medium">{cust.petsStatus || "Ninguna"}</span>
                    </td>
                    <td className="p-4 text-gray-500 font-mono text-[10px]">
                      {cust.keyPreferences === "lockbox" ? (
                        <span className="text-amber-850">Caja de Seguridad ({cust.lockboxCode || "Sin código"})</span>
                      ) : (
                        cust.keyPreferences || "No especificado"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 8. REVIEWS MODERATION TAB */}
      {!isLoading && activeSubTab === 'reviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-250">
          {/* Left: Certify review form */}
          <div className="lg:col-span-5 bg-white border border-gray-100 rounded-2xl p-6 text-left space-y-4 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 font-sans">Inyectar Reseña Certificada</h3>
              <p className="text-[10px] text-gray-400 leading-normal">Inserta opiniones directo al sistema para robustecer la prueba social pública.</p>
            </div>

            <form onSubmit={handleCreateReviewAdmin} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nombre Deseado</label>
                <input
                  type="text"
                  required
                  value={newAuthorName}
                  onChange={(e) => setNewAuthorName(e.target.value)}
                  placeholder="ej: Monica Beltran"
                  className="w-full text-xs p-3 rounded-xl border border-gray-250 focus:ring-1 focus:ring-brand focus:outline-none bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Categoría</label>
                  <select
                    value={newServiceId}
                    onChange={(e) => setNewServiceId(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-gray-250 bg-white focus:ring-1 focus:ring-brand focus:outline-none"
                  >
                    {globalServices.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Calificación</label>
                  <select
                    value={newRating}
                    onChange={(e) => setNewRating(Number(e.target.value))}
                    className="w-full text-xs p-3 rounded-xl border border-gray-250 bg-white focus:ring-1 focus:ring-brand focus:outline-none text-amber-500 font-bold"
                  >
                    <option value={5}>★★★★★ (5.0)</option>
                    <option value={4}>★★★★☆ (4.0)</option>
                    <option value={3}>★★★☆☆ (3.0)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Comentario del Cliente</label>
                <textarea
                  required
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="ej: El técnico instaló mi televisión de manera super prolija y rápida. ¡Excelente servicio!"
                  className="w-full text-xs p-3 rounded-xl border border-gray-250 focus:ring-1 focus:ring-brand focus:outline-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isReviewSubmitting}
                className="w-full py-3 bg-stone-900 border-none text-white text-xs font-black rounded-xl cursor-pointer hover:bg-stone-950 disabled:opacity-70 disabled:cursor-wait transition-all flex items-center justify-center gap-2"
              >
                <ActionButtonContent
                  actionId="create-review"
                  idleLabel="Graba Reseña Certificada en Firestore"
                  pendingLabel="Guardando reseña..."
                  icon={Icons.Save}
                />
              </button>
            </form>
          </div>

          {/* Right: Moderation list */}
          <div className="lg:col-span-7 bg-white border border-gray-100 rounded-2xl p-6 text-left space-y-4 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Listado Público de Reseñas</h3>
              <p className="text-[10px] text-gray-550">Historial de satisfacción general de usuarios en Springfield de Greenbee.</p>
            </div>

            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
              {reviews.map(rev => {
                const service = globalServices.find(s => s.id === rev.serviceId);
                return (
                  <div key={rev.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-150 space-y-2 relative">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-gray-800">{rev.authorName}</span>
                          <span className="text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold uppercase rounded px-1.5 py-0.2 select-none font-mono">
                            Verificado
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{service?.name || "Servicio General"} • {rev.date}</p>
                      </div>

                      <div className="flex gap-2">
                        <span className="text-xs text-amber-500 font-black">{"★".repeat(rev.rating)}</span>
                        {onDeleteReview && (
                          <button
                            onClick={async () => {
                              if (confirm("¿Estás seguro de que deseas eliminar permanentemente esta reseña de Firestore?")) {
                                const actionId = `delete-review-${rev.id}`;
                                beginAction(actionId, "Eliminando reseña...");
                                try {
                                  onDeleteReview(rev.id);
                                  await recordActivity({
                                    type: "review_deleted",
                                    entityType: "review",
                                    entityId: rev.id,
                                    title: "Resena eliminada",
                                    detail: `Se elimino la resena de ${rev.authorName}.`,
                                    severity: "warning"
                                  });
                                  triggerSuccess(`Reseña de ${rev.authorName} eliminada.`);
                                } finally {
                                  endAction(actionId);
                                }
                              }
                            }}
                            disabled={isActionPending(`delete-review-${rev.id}`)}
                            className="text-gray-400 hover:text-red-650 disabled:opacity-50 disabled:cursor-wait bg-transparent border-none p-0 shrink-0 cursor-pointer"
                            title="Eliminar Reseña"
                          >
                            {isActionPending(`delete-review-${rev.id}`) ? (
                              <Icons.RotateCw size={13} className="animate-spin" />
                            ) : (
                              <Icons.Trash2 size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-650 leading-relaxed italic">
                      "{rev.comment}"
                    </p>

                    <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                      <Icons.Heart size={11} className="text-rose-500" />
                      <span>{rev.helpfulCount} personas marcaron como útil</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 9. INTEGRATIONS TAB */}
      {!isLoading && activeSubTab === 'integrations' && (
        <form onSubmit={handleSaveIntegrationSettings} className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5">
              <div>
                <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-2">
                  <Icons.CreditCard size={16} className="text-[#0ead6b]" />
                  <span>Stripe Embedded Checkout</span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                  Guarda aqui solo la clave publicable. La clave secreta vive en Vercel para proteger cobros y PaymentIntents.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Modo Stripe</label>
                  <select
                    value={businessSettings.stripeMode || "test"}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, stripeMode: e.target.value as BusinessSettings["stripeMode"] })}
                    className="w-full text-xs p-3 rounded-xl border border-gray-250 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-brand outline-none font-bold text-gray-800"
                  >
                    <option value="test">Test / Sandbox</option>
                    <option value="live">Live / Produccion</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Stripe Publishable Key</label>
                  <input
                    type="text"
                    value={businessSettings.stripePublishableKey || ""}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, stripePublishableKey: e.target.value.trim() })}
                    placeholder="pk_test_... o pk_live_..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-250 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-brand outline-none font-mono"
                  />
                </div>
              </div>

            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5">
              <div>
                <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-2">
                  <Icons.MapPin size={16} className="text-[#0ead6b]" />
                  <span>Google Maps / Places</span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                  Guarda una API key publica restringida por dominio para autocompletar direcciones y mapas futuros.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-start justify-between gap-4 rounded-xl border border-gray-150 bg-gray-50 p-4 cursor-pointer">
                  <div>
                    <span className="font-extrabold text-xs text-gray-900 block">Activar Google Maps</span>
                    <span className="text-[10px] text-gray-500 leading-relaxed block mt-0.5">
                      Dejalo listo para conectar autocompletado de direccion y validacion por zona.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={businessSettings.googleMapsEnabled || false}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, googleMapsEnabled: e.target.checked })}
                    className="rounded border-gray-300 text-brand focus:ring-brand h-5 w-5 cursor-pointer"
                  />
                </label>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Google Maps Browser API Key</label>
                  <input
                    type="text"
                    value={businessSettings.googleMapsApiKey || ""}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, googleMapsApiKey: e.target.value.trim() })}
                    placeholder="AIza_REPLACE_ME_BROWSER_KEY"
                    className="w-full text-xs p-3 rounded-xl border border-gray-250 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-brand outline-none font-mono"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={businessSettings.googleMapsAutocompleteEnabled !== false}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, googleMapsAutocompleteEnabled: e.target.checked })}
                    className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4 cursor-pointer"
                  />
                  <span>Usar Places Autocomplete cuando se conecte el formulario de direccion</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5">
              <div>
                <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-2">
                  <Icons.KeyRound size={16} className="text-[#0ead6b]" />
                  <span>Google Auth</span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                  Controla si el acceso con Google se muestra en las pantallas publicas.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start justify-between gap-4 rounded-xl border border-gray-150 bg-gray-50 p-4 cursor-pointer">
                  <div>
                    <span className="font-extrabold text-xs text-gray-900 block">Mostrar Google Sign-In</span>
                    <span className="text-[10px] text-gray-500 leading-relaxed block mt-0.5">
                      Guarda la preferencia para el portal publico y futuras pantallas de autenticacion.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={businessSettings.googleAuthEnabled !== false}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, googleAuthEnabled: e.target.checked })}
                    className="rounded border-gray-300 text-brand focus:ring-brand h-5 w-5 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="submit"
              disabled={isActionPending("save-integrations")}
              className="py-3 px-5 bg-stone-900 border-none text-white text-xs font-black rounded-xl hover:bg-stone-950 disabled:opacity-70 disabled:cursor-wait transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <ActionButtonContent
                actionId="save-integrations"
                idleLabel="Guardar Integraciones"
                pendingLabel="Guardando integraciones..."
                icon={Icons.Save}
              />
            </button>
          </div>
        </form>
      )}

      {/* 9. ADJUSTS / SHOP CONFIGURATION TAB */}
      {!isLoading && activeSubTab === 'settings' && (
        <form onSubmit={handleSaveBusinessSettings} className="bg-white rounded-2xl border border-gray-100 p-6 text-left space-y-6 max-w-2xl mx-auto shadow-xs animate-in fade-in duration-200">
          <div>
            <h3 className="font-extrabold text-sm text-gray-950">Ajustes Generales de la Operación</h3>
            <p className="text-[10px] text-gray-500">Configura los parámetros globales del negocio y habilitación de cobros.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Nombre Comercial de Empresa</label>
              <input
                type="text"
                required
                value={businessSettings.name}
                onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-gray-250 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-brand outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Celular de Atención al Cliente</label>
                <input
                  type="text"
                  required
                  value={businessSettings.phone}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-gray-250 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-brand outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Correo de Soporte Técnico</label>
                <input
                  type="email"
                  required
                  value={businessSettings.email}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-gray-250 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-brand outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Zona Horaria Predeterminada</label>
              <select
                value={businessSettings.timezone}
                onChange={(e) => setBusinessSettings({ ...businessSettings, timezone: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-gray-250 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-brand outline-none font-bold text-gray-800"
              >
                <option value="Central Standard Time (CST)">Central Standard Time (CST)</option>
                <option value="Eastern Standard Time (EST)">Eastern Standard Time (EST)</option>
                <option value="Pacific Standard Time (PST)">Pacific Standard Time (PST)</option>
              </select>
            </div>

            {/* CRM Webhook URL */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">CRM Webhook URL</label>
              <input
                type="url"
                placeholder="https://hooks.zapier.com/... o https://webhook.site/..."
                value={businessSettings.crmWebhookUrl || ""}
                onChange={e => setBusinessSettings({ ...businessSettings, crmWebhookUrl: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
              <p className="text-[10px] text-gray-400">Recibe eventos de leads (contactado, recuperado, perdido, email enviado) en tu CRM, Zapier o Make.</p>
            </div>

            <div className="bg-amber-50/30 border border-amber-900/10 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5 text-left max-w-md">
                <span className="font-extrabold text-stone-900 block text-xs">Activar Motor de Cotizaciones y Reservas</span>
                <span className="text-[10px] text-gray-500 block leading-normal">
                  Permite o bloquea el envío de cotizaciones y citas de servicios en el estimador del frontend público.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={businessSettings.bookingEnabled}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, bookingEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-brand focus:ring-brand h-5 w-5 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isActionPending("save-settings")}
            className="w-full py-3 bg-stone-900 border-none text-white text-xs font-black rounded-xl hover:bg-stone-950 disabled:opacity-70 disabled:cursor-wait transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <ActionButtonContent
              actionId="save-settings"
              idleLabel="Guardar Ajustes en Firestore"
              pendingLabel="Guardando ajustes..."
              icon={Icons.Save}
            />
          </button>
        </form>
      )}
        </div>
      </div>

      {/* ── Photo Modal ───────────────────────────────────────────────────────── */}
      {photoModalBooking && (
        <div
          className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4"
          onClick={() => { setPhotoModalBooking(null); setPhotoLightboxIdx(null); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-extrabold text-gray-950">Fotos del job</h3>
                <p className="text-[10px] text-gray-400">{photoModalBooking.customerName} · {photoModalBooking.bookingDate} · {photoModalBooking.serviceName}</p>
              </div>
              <button
                type="button"
                onClick={() => { setPhotoModalBooking(null); setPhotoLightboxIdx(null); }}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 border-none cursor-pointer text-gray-500 transition-colors"
              >
                <Icons.X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {(!photoModalBooking.photos || photoModalBooking.photos.length === 0) ? (
                <div className="text-center py-10 space-y-2">
                  <Icons.Camera size={32} className="mx-auto text-gray-200" />
                  <p className="text-sm text-gray-400 font-bold">Sin fotos todavía</p>
                  <p className="text-xs text-gray-300">El técnico asignado puede subir fotos antes/después desde el Staff Portal.</p>
                </div>
              ) : (
                (['before', 'after'] as const).map(phase => {
                  const phasePhotos = photoModalBooking.photos!.filter(p => p.phase === phase);
                  if (phasePhotos.length === 0) return null;
                  return (
                    <div key={phase} className="space-y-2">
                      <h4 className={`text-xs font-black uppercase tracking-wider ${phase === 'before' ? 'text-sky-600' : 'text-violet-600'}`}>
                        {phase === 'before' ? '▸ Before' : '▸ After'}
                      </h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {phasePhotos.map((photo, i) => (
                          <div key={photo.url} className="relative group">
                            <button
                              type="button"
                              onClick={() => setPhotoLightboxIdx(photoModalBooking.photos!.indexOf(photo))}
                              className="w-full aspect-square rounded-xl overflow-hidden border border-gray-100 cursor-pointer p-0 hover:opacity-90 transition-opacity"
                            >
                              <img src={photo.url} alt={photo.phase} className="w-full h-full object-cover" />
                            </button>
                            {/* Delete button */}
                            <button
                              type="button"
                              title="Eliminar foto"
                              onClick={async () => {
                                if (!confirm("¿Eliminar esta foto?")) return;
                                const token = await auth.currentUser?.getIdToken();
                                if (!token) return;
                                const resp = await fetch('/api/delete-job-photo', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ bookingId: photoModalBooking.id, photoUrl: photo.url }),
                                });
                                if (resp.ok) {
                                  const updated = { ...photoModalBooking, photos: photoModalBooking.photos!.filter(p => p.url !== photo.url) };
                                  setPhotoModalBooking(updated);
                                  setGlobalBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
                                }
                              }}
                              className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-none cursor-pointer"
                            >
                              <Icons.X size={9} />
                            </button>
                            <p className="text-[8px] text-gray-400 mt-0.5 truncate">
                              {new Date(photo.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Lightbox */}
          {photoLightboxIdx !== null && photoModalBooking.photos && (
            <div
              className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
              onClick={() => setPhotoLightboxIdx(null)}
            >
              <button
                type="button"
                className="absolute top-4 right-4 text-white/70 hover:text-white border-none bg-transparent cursor-pointer p-2"
                onClick={() => setPhotoLightboxIdx(null)}
              >
                <Icons.X size={22} />
              </button>
              <img
                src={photoModalBooking.photos[photoLightboxIdx]?.url}
                alt="photo"
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
                onClick={(e) => e.stopPropagation()}
              />
              {photoModalBooking.photos.length > 1 && (
                <div className="flex items-center gap-3 mt-4" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setPhotoLightboxIdx(i => Math.max((i ?? 0) - 1, 0))}
                    disabled={photoLightboxIdx === 0}
                    className="px-4 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold disabled:opacity-30 border-none cursor-pointer hover:bg-white/20"
                  >← Prev</button>
                  <span className="text-white/60 text-xs">{photoLightboxIdx + 1} / {photoModalBooking.photos.length}</span>
                  <button
                    type="button"
                    onClick={() => setPhotoLightboxIdx(i => Math.min((i ?? 0) + 1, photoModalBooking.photos!.length - 1))}
                    disabled={photoLightboxIdx === photoModalBooking.photos.length - 1}
                    className="px-4 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold disabled:opacity-30 border-none cursor-pointer hover:bg-white/20"
                  >Next →</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
