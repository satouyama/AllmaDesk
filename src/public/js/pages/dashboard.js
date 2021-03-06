

define('pages/dashboard', [
    'jquery',
    'underscore',
    'modules/helpers',
    'countup',
    'c3',
    'moment',
    'd3pie',
    'metricsgraphics',
    'peity',
    'history'

], function($, _, helpers, CountUp, c3, moment) {
    var dashboardPage = {};

    dashboardPage.init = function(callback) {
        $(document).ready(function() {
            var testPage = $('#page-content').find('.dashboard');
            if (testPage.length < 1) {
                if (typeof callback === 'function')
                    return callback();

                return;
            }

            helpers.resizeAll();

            var parms = {
                full_width: true,
                height: 250,
                target: '#test',
                x_accessor: 'date',
                y_accessor: 'value',
                y_extended_ticks: true,
                show_tooltips: false,
                aggregate_rollover: true,
                transition_on_update: false,
                colors: ['#2196f3', 'red']
            };

            var showOverdue = $('#__showOverdueTickets').text().toLowerCase() === 'true';
            if (showOverdue) {
                var overdueCard = $('#overdue_tickets');
                var $overdue_table_body = overdueCard.find('table.uk-table > tbody');
                $overdue_table_body.empty(); // Clear
                $.ajax({
                    url: '/api/v1/tickets/overdue',
                    method: 'GET',
                    success: function(_data) {
                        var overdueSpinner = overdueCard.find('.card-spinner');
                        var html = '';
                        _.each(_data.tickets, function(ticket) {
                            html += '<tr class="uk-table-middle">';
                            html += '<td class="uk-width-1-10 uk-text-nowrap"><a href="/tickets/'+ ticket.uid + '">T#' + ticket.uid + '</a></td>';
                            html += '<td class="uk-width-1-10 uk-text-nowrap"><span class="uk-badge ticket-status-open uk-width-1-1">Open</span></td>';
                            html += '<td class="uk-width-6-10">' + ticket.subject + '</td>';
                            html += '<td class="uk-width-2-10 uk-text-right uk-text-muted uk-text-small">' + moment(ticket.updated).format('MM.DD.YYYY') + '</td>';
                            html += '</tr>';
                        });

                        $overdue_table_body.append(html);

                        overdueSpinner.animate({opacity: 0}, 600, function() {
                            $(this).hide();
                        });
                    },
                    error: function(err) {
                        console.log('[trudesk:dashboard:loadOverdue] Error - ' + err.responseText);
                        helpers.UI.showSnackbar(err.responseText, true);
                    }
                });
            }

            getData(30);

            $('#select_timespan').on('change', function () {
                var self = $(this);
                getData(self.val());
            });

            function getData(timespan) {
                $.ajax({
                    url: '/api/v1/tickets/stats/' + timespan,
                    method: 'GET',
                    success: function (_data) {
                        var lastUpdated = $('#lastUpdated').find('span');
                        lastUpdated.text(_data.lastUpdated);

                        if (!_data.data) {
                            console.log('[trudesk:dashboard:getData] Error - Invalid Graph Data');
                            helpers.UI.showSnackbar('Error - Invalid Graph Data', true);
                        } else {
                            parms.data = MG.convert.date(_data.data, 'date');
                            MG.data_graphic(parms);
                        }

                        var tCount = _data.ticketCount;

                        var ticketCount = $('#ticketCount');
                        var oldTicketCount = ticketCount.text() === '--' ? 0 : ticketCount.text();
                        var totalTicketText = 'Total Tickets (last ' + timespan + 'd)';
                        // if (timespan == 0)
                        //     totalTicketText = 'Total Tickets (lifetime)';
                        ticketCount.parents('.tru-card-content').find('span.uk-text-small').text(totalTicketText);
                        var theAnimation = new CountUp('ticketCount', parseInt(oldTicketCount), tCount, 0, 1.5);
                        theAnimation.start();

                        var closedCount = Number(_data.closedCount);
                        var closedPercent = Math.round((closedCount / tCount) * 100);

                        var textComplete = $('#text_complete');
                        var oldTextComplete = textComplete.text() === '--' ? 0 : textComplete.text();
                        var completeAnimation = new CountUp('text_complete', parseInt(oldTextComplete), closedPercent, 0, 1.5);
                        completeAnimation.start();

                        var pieComplete = $('#pie_complete');
                        pieComplete.text(closedPercent + '/100');
                        pieComplete.peity("donut", {
                            height: 24,
                            width: 24,
                            fill: ["#29b955", "#ccc"]
                        });

                        var responseTime_text = $('#responseTime_text');
                        //var responseTime_graph = $('#responseTime_graph');
                        var oldResponseTime = responseTime_text.text() === '--' ? 0 : responseTime_text.text();
                        var responseTime = _data.ticketAvg;
                        var responseTime_animation = new CountUp('responseTime_text', parseInt(oldResponseTime), responseTime, 0, 1.5);
                        responseTime_animation.start();

                        //QuickStats
                        var mostRequester = $('#mostRequester');
                        if (_data.mostRequester !== null)
                        mostRequester.text(_data.mostRequester.name + ' (' + _data.mostRequester.value + ')');
                        var mostCommenter = $('#mostCommenter');
                        if (_data.mostCommenter !== null)
                            mostCommenter.text(_data.mostCommenter.name + ' (' + _data.mostCommenter.value + ')');
                        else
                            mostCommenter.text('--');

                        var mostAssignee = $('#mostAssignee');
                        if (_data.mostAssignee !== null)
                            mostAssignee.text(_data.mostAssignee.name + ' (' + _data.mostAssignee.value + ')');
                        else
                            mostAssignee.text('--');

                        var mostActiveTicket = $('#mostActiveTicket');
                        if (_data.mostActiveTicket !== null)
                            mostActiveTicket.attr('href', '/tickets/' + _data.mostActiveTicket.uid).text('T#' + _data.mostActiveTicket.uid);
                    },
                    error: function(err) {
                        console.log('[trudesk:dashboard:getData] Error - ' + err.responseText);
                        helpers.UI.showSnackbar(err.responseText, true);
                    }
                });

                $('#topTenTags').parents('.panel').find('.card-spinner').css({display: 'block', opacity: 1});
                $.ajax({
                    url: '/api/v1/tickets/count/tags/' + timespan,
                    method: 'GET',
                    success: function(data) {
                        var arr = _.map(data.tags, function(v, key) {
                            return [key, v];
                        });

                        arr = _.first(arr, 10);
                        var colors = [
                            '#e74c3c',
                            '#3498db',
                            '#9b59b6',
                            '#34495e',
                            '#1abc9c',
                            '#2ecc71',
                            '#03A9F4',
                            '#00BCD4',
                            '#009688',
                            '#4CAF50',
                            '#FF5722',
                            '#CDDC39',
                            '#FFC107',
                            '#00E5FF',
                            '#E040FB',
                            '#607D8B'
                        ];

                        var c = _.object(_.map(arr, function(v) {
                            return v[0];
                        }), _.shuffle(colors));

                        c3.generate({
                            bindto: d3.select('#topTenTags'),
                            size: {
                                height: 200
                            },
                            data: {
                                columns: arr,
                                type: 'donut',
                                colors: c,
                                empty: { label: { text: "Nenhum dado disponível" } }

                            },
                            donut: {
                                label: {
                                    format: function (value, ratio, id) {
                                        return '';
                                    }
                                }
                            }
                        });

                        $('#topTenTags').parents('.panel').find('.card-spinner').animate({opacity: 0}, 600, function() {
                            $(this).hide();
                        });
                    }
                });


                $('#pieChart').parent().find('.card-spinner').css({display: 'block', opacity: 1});
                $.ajax({
                    url: '/api/v1/tickets/count/topgroups/' + timespan + '/5',
                    method: 'GET',
                    success: function(data) {

                        var arr = _.map(data.items, function(v) {
                            return [v.name, v.count];
                        });

                        var colors = [
                            '#e74c3c',
                            '#3498db',
                            '#9b59b6',
                            '#34495e',
                            '#1abc9c',
                            '#2ecc71',
                            '#03A9F4',
                            '#00BCD4',
                            '#009688',
                            '#4CAF50',
                            '#FF5722',
                            '#CDDC39',
                            '#FFC107',
                            '#00E5FF',
                            '#E040FB',
                            '#607D8B'
                        ];

                        colors = _.shuffle(colors);

                        var c = _.object(_.map(arr, function(v) {
                            return v[0];
                        }), colors);

                        c3.generate({
                            bindto: d3.select('#pieChart'),
                            size: {
                                height: 200
                            },
                            data: {
                                columns: arr,
                                type: 'pie',
                                colors: c,
                                empty: { label: { text: "Nenhum dado disponível" } }
                            },
                            donut: {
                                label: {
                                    format: function (value, ratio, id) {
                                        return '';
                                    }
                                }
                            }
                        });

                        $('#pieChart').parent().find('.card-spinner').animate({opacity: 0}, 600, function() {
                            $(this).hide();
                        });
                    }
                });
            }

            if (typeof callback === 'function')
                return callback();
        });
    };

    return dashboardPage;
});