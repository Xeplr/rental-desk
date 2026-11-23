// api/functions/rentals.js — what the Rentals form does, on the server.
var { register } = require('@xeplr/actions');

register({
  name: 'checkRental',
  event: 'beforeSave',
  description: 'Refuses a return date before the start, and works out the total from the days and the daily rate.',
  execute: async function (ctx) {
    var v = ctx.values;
    if (v.endDate < v.startDate) {
      return ctx.reject('The return date is before the start date', { field: 'endDate' });
    }
    var item = await ctx.knex('equipment_items').where({ id: v.equipment }).first();
    var days = Math.max(1, (new Date(v.endDate) - new Date(v.startDate)) / 86400000);
    return Object.assign({}, v, { total: days * Number(item.dailyRate) });
  }
});

register({
  name: 'setRentalStatus',
  event: 'button',
  description: 'Moves a rental to Out or Returned, and keeps the note it was given.',
  inputSchema: [
    { name: 'status', type: 'string', required: true,
      options: [{ value: 'out', label: 'Out' }, { value: 'returned', label: 'Returned' }] },
    { name: 'note', type: 'string' }
  ],
  execute: async function ({ input, system }) {
    var changes = { status: input.status };
    if (input.note) changes.notes = input.note;
    await system.db('rentals').where('id', system.id).update(changes);
    return { message: system.record.reference + ' is now ' + input.status + '.' };
  }
});

register({
  name: 'rentalBoard',
  event: 'listRows',
  description: 'Every rental with its customer and equipment, with counts for the chips and cards.',
  execute: async function (ctx) {
    var q = ctx.query;
    var all = await ctx.knex('rentals as r')
      .join('customers as c', 'c.id', 'r.customer')
      .join('equipment_items as e', 'e.id', 'r.equipment')
      .where('r.isActive', true)
      .orderBy('r.startDate', 'desc')
      .select('r.id', 'r.reference', 'r.status', 'r.total',
        'c.name as customer', 'e.name as equipment',
        ctx.knex.raw(`to_char(r."startDate", 'YYYY-MM-DD') as "startDate"`),
        ctx.knex.raw(`to_char(r."endDate", 'YYYY-MM-DD') as "endDate"`),
        ctx.knex.raw(`to_char(r."startDate", 'DD Mon') || ' – ' ||
                      to_char(r."endDate", 'DD Mon') as dates`));

    var today = new Date().toISOString().slice(0, 10);
    var names = { reserved: 'Reserved', out: 'Out', returned: 'Returned' };
    all.forEach(function (r) {
      r.overdue = r.status === 'out' && r.endDate < today;
      r.state = r.overdue ? 'Overdue' : names[r.status];
    });

    var is = {
      reserved: function (r) { return r.status === 'reserved'; },
      out: function (r) { return r.status === 'out'; },
      overdue: function (r) { return r.overdue; },
      returned: function (r) { return r.status === 'returned'; }
    };
    var inRange = all.filter(function (r) {
      return (!q.from || r.startDate >= q.from) && (!q.to || r.startDate <= q.to);
    });
    var count = function (k) { return inRange.filter(is[k]).length; };

    var pick = is[q.kpi] || is[q.filter];
    var words = (q.q || '').toLowerCase();
    var rows = inRange.filter(function (r) {
      var text = (r.reference + ' ' + r.customer + ' ' + r.equipment).toLowerCase();
      return (!pick || pick(r)) && text.indexOf(words) !== -1;
    });

    return {
      rows: rows,
      counts: { all: inRange.length, reserved: count('reserved'), out: count('out'),
                overdue: count('overdue'), returned: count('returned') },
      kpis: { out: count('out'), overdue: count('overdue'), reserved: count('reserved') }
    };
  }
});
