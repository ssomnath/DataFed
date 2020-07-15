#ifndef TASKMGR_HPP
#define TASKMGR_HPP

#include <chrono>
#include <string>
#include <vector>
#include <list>
#include <deque>
#include <map>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <libjson.hpp>
#include "ITaskMgr.hpp"
#include "ITaskWorker.hpp"
#include "Config.hpp"
#include "SDMS_Auth.pb.h"
#include "SDMS.pb.h"

namespace SDMS {
namespace Core {

//class TaskWorker;

class TaskMgr : public ITaskMgr
{
public:
    static TaskMgr & getInstance();

    void    newTask( const std::string & a_task_id );
    void    cancelTask( const std::string & a_task_id );

private:
    //typedef std::vector<std::pair<std::string,std::string>> url_params_t;

    TaskMgr();
    ~TaskMgr();

    void        maintenanceThread();
    void        newTasks( const libjson::Value & a_tasks );
    void        createTaskScheduleWorker( const std::string & a_task_id );
    void        taskScheduleWorker( Task * a_task );

    void        wakeNextWorker();
    Task *      getNextTask( ITaskWorker * a_worker );
    void        rescheduleTask( Task * a_task );
    bool        retryTask( Task * a_task );
    void        purgeTaskHistory() const;


    Config &                            m_config;
    std::deque<Task*>                   m_tasks_ready; // Includes tasks in either INIT or READY states
    std::multimap<timepoint_t,Task*>    m_tasks_retry;
    std::mutex                          m_worker_mutex;
    std::vector<ITaskWorker*>           m_workers;
    ITaskWorker *                       m_worker_next;
    std::thread *                       m_maint_thread;
    std::mutex                          m_maint_mutex;
    std::condition_variable             m_maint_cvar;
};

}}

#endif
