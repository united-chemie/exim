cur_frm.add_fetch("item_code", "license_name", "license_name");

let set_currency = 0;

frappe.ui.form.on("Advance Authorisation License",{
	approved_qty:function(frm) {
		var remaining_exp_qty = flt(frm.doc.approved_qty) - flt(frm.doc.total_export_qty);
		frm.set_value("remaining_export_qty", remaining_exp_qty);
	},
	
	approved_amount:function(frm){
		var remaining_exp_amount = flt(frm.doc.approved_amount) - flt(frm.doc.total_export_amount);
		frm.set_value("remaining_export_amount", remaining_exp_amount);
	},
	onload: function(frm){
		if(frm.doc.__islocal) {
			frm.doc.item_import_ratio.forEach(function(d) {
				frappe.model.set_value(d.doctype,d.name,"currency", "USD" );
			});
		}
	},
}); 


frappe.ui.form.on("Item Import Ratio", {
	ratio: function(frm, cdt, cdn) {
		let d = locals[cdt][cdn];
		if (d.ratio>1){
			frappe.throw(__("Ratio cannot be greater than 1"));
		}
		frappe.model.set_value(cdt, cdn, "approved_qty", flt(frm.doc.approved_qty * d.ratio));
		//frappe.model.set_value(cdt, cdn, "approved_amount", flt(frm.doc.approved_amount * d.ratio));
	},

	approved_qty: function(frm,cdt,cdn){
		let d = locals[cdt][cdn];
		if(frm.doc.approved_qty){
			frappe.model.set_value(cdt, cdn, "ratio",flt(d.approved_qty/frm.doc.approved_qty))
		}
	},
	item_import_ratio_add:function(frm , cdt, cdn){
		frappe.model.set_value(cdt,cdn,"currency", "USD" );
	},
	// currency: function(frm, cdt, cdn){
	// 	if(d.currency == 'INR' && !set_currency){
	// 		frappe.model.set_value(d.doctype,d.name,"currency", "USD" );
	// 		set_currency = 1;
	// 	}
	// },
});

frappe.ui.form.on("Export Against AAL", {
    sales_invoice: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (!row.sales_invoice) {
            return;
        }

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Sales Invoice",
                name: row.sales_invoice
            },
            callback: function(r) {

                if (!r.message) {
                    return;
                }

                let invoice = r.message;
                let item = invoice.items && invoice.items[0];
                if (!item) {
                    frappe.msgprint("No items found in Sales Invoice");
                    return;
                }
                frappe.model.set_value(cdt, cdn, "item_code", item.item_code);
				frappe.model.set_value(cdt, cdn, "item_name", item.item_name);
                frappe.model.set_value(cdt, cdn, "quantity", item.qty);
				frappe.model.set_value(cdt, cdn, "shipping_bill_no", invoice.shipping_bill_number);
				frappe.model.set_value(cdt, cdn, "shipping_bill_date", invoice.shipping_bill_date);
				frappe.model.set_value(cdt, cdn, "currency", invoice.currency);
				frappe.model.set_value(cdt, cdn, "port_of_loading", invoice.port_of_loading);
				frappe.model.set_value(cdt, cdn, "port_of_discharge", invoice.port_of_discharge);
				frappe.model.set_value(cdt, cdn, "base_fob_value", item.base_fob_value || 0);
                frappe.model.set_value(cdt,cdn, "brc_no", invoice.brc_no);


                frappe.model.set_value(
                    cdt,
                    cdn,
                    "fob_value",
                    item.fob_value || 0
                );
                frm.refresh_field("exports");
            }
        });
    }
});

frappe.ui.form.on("Import Against AAL", {
    purchase_invoice: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (!row.purchase_invoice) return;

        // Fetch Purchase Invoice Data
        frappe.db.get_doc("Purchase Invoice", row.purchase_invoice).then(inv => {
            if (inv.items && inv.items.length > 0) {
                let item = inv.items[0];
                frappe.model.set_value(cdt, cdn, "item_code", item.item_code);
                frappe.model.set_value(cdt, cdn, "item_name", item.item_name);
                frappe.model.set_value(cdt, cdn, "quantity", item.qty);
                frappe.model.set_value(cdt, cdn, "fob_value", item.taxable_value || 0);
            }
            
            frappe.model.set_value(cdt, cdn, "currency", inv.currency);
            frappe.model.set_value(cdt, cdn, "port_of_loading", inv.port_of_loading);
            frappe.model.set_value(cdt, cdn, "port_of_discharge", inv.port_of_discharge);
            
            // Call the Python server-side method to bypass Child Table restrictions
            frappe.call({
                // IMPORTANT: Change 'your_app.api.get_boe_details' to your actual python file path
                method: "exim.exim.doctype.advance_authorisation_license.advance_authorisation_license.get_boe_details", 
                args: {
                    purchase_invoice: row.purchase_invoice
                },
                callback: function(r) {
                    if (r.message) {
                        frappe.model.set_value(cdt, cdn, "shipping_bill_no", r.message.bill_of_entry_no);
                        frappe.model.set_value(cdt, cdn, "shipping_bill_date", r.message.bill_of_entry_date);
                    }
                }
            });
        });
    }
});