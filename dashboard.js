
    // =====================================
    // SUBSCRIPTION ACCESS VERIFICATION
    // =====================================

    let currentSubscription = null;

    try {
        const now = new Date().toISOString();

        const { data: subscription, error: subscriptionError } =
            await supabaseClient
                .from("subscriptions")
                .select("id, plan_name, status, starts_at, expires_at")
                .eq("user_id", currentUser.id)
                .eq("status", "active")
                .gt("expires_at", now)
                .order("expires_at", { ascending: false })
                .limit(1)
                .maybeSingle();

        if (subscriptionError) {
            console.error(
                "Subscription verification failed:",
                subscriptionError
            );

            alert(
                "We couldn't verify your subscription. Please try again."
            );
            return;
        }

        if (!subscription) {
            alert(
                "Your LifeTrack subscription is inactive or expired. Please renew to continue."
            );

            window.location.href = "payment.html";
            return;
        }

        currentSubscription = subscription;

        console.log(
            "Active LifeTrack subscription:",
            currentSubscription
        );

    } catch (error) {
        console.error("Subscription check error:", error);

        alert("Unable to verify your subscription.");
        return;
    }
       
